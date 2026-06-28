# AWS Infrastructure Setup — lumina

> Recursos a crear manualmente ANTES del primer deploy.
> NO se crean automáticamente — requieren `aws sso login` con permisos suficientes.
> Todos en region **us-west-2** salvo indicación.

---

## Prerequisitos del operador

Antes de crear cualquier recurso:

```bash
# 1. Login SSO
aws sso login --profile propital-cto

# 2. Verificar acceso Luma Ray 2 en Bedrock
aws bedrock list-foundation-models \
  --region us-west-2 \
  --query 'modelSummaries[?contains(modelId, `luma`)]' \
  --profile propital-cto

# Si no aparece → Bedrock Console → Model access → Habilitar luma.ray-v2:0

# 3. Confirmar precio (estimación: $1.50/s a 720p)
aws pricing get-products \
  --service-code AmazonBedrock \
  --filters "Type=TERM_MATCH,Field=modelId,Value=luma.ray-v2:0" \
  --region us-east-1   # pricing API solo en us-east-1
```

---

## 1. S3 Buckets (us-west-2)

### lumina-inputs (imágenes de los tenants)

```bash
aws s3api create-bucket \
  --bucket lumina-inputs \
  --region us-west-2 \
  --create-bucket-configuration LocationConstraint=us-west-2

# Bloquear acceso público
aws s3api put-public-access-block \
  --bucket lumina-inputs \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Lifecycle: eliminar uploads/ después de 2 días
aws s3api put-bucket-lifecycle-configuration \
  --bucket lumina-inputs \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "delete-uploads-2d",
      "Filter": {"Prefix": "uploads/"},
      "Status": "Enabled",
      "Expiration": {"Days": 2}
    }]
  }'

# CORS para presigned PUT desde browser (si el tenant sube desde frontend)
aws s3api put-bucket-cors \
  --bucket lumina-inputs \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["PUT"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": [],
      "MaxAgeSeconds": 3600
    }]
  }'
```

### lumina-outputs (clips intermedios + video final)

```bash
aws s3api create-bucket \
  --bucket lumina-outputs \
  --region us-west-2 \
  --create-bucket-configuration LocationConstraint=us-west-2

aws s3api put-public-access-block \
  --bucket lumina-outputs \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Lifecycle: eliminar tours/ después de 30 días (retención de video, Q4)
aws s3api put-bucket-lifecycle-configuration \
  --bucket lumina-outputs \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "delete-tours-30d",
      "Filter": {"Prefix": "tours/"},
      "Status": "Enabled",
      "Expiration": {"Days": 30}
    }]
  }'
```

---

## 2. SQS Queues (us-west-2)

### lumina-jobs.fifo (FIFO — jobs de generación)

```bash
aws sqs create-queue \
  --queue-name lumina-jobs-dlq.fifo \
  --attributes FifoQueue=true,ContentBasedDeduplication=false \
  --region us-west-2

DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url https://sqs.us-west-2.amazonaws.com/<account-id>/lumina-jobs-dlq.fifo \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' --output text)

aws sqs create-queue \
  --queue-name lumina-jobs.fifo \
  --attributes "FifoQueue=true,ContentBasedDeduplication=false,\
VisibilityTimeout=900,\
RedrivePolicy={\"deadLetterTargetArn\":\"$DLQ_ARN\",\"maxReceiveCount\":\"3\"}" \
  --region us-west-2
```

### lumina-webhooks (Standard — despacho de webhooks)

```bash
aws sqs create-queue \
  --queue-name lumina-webhooks-dlq \
  --region us-west-2

DLQ_WH_ARN=$(aws sqs get-queue-attributes \
  --queue-url https://sqs.us-west-2.amazonaws.com/<account-id>/lumina-webhooks-dlq \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' --output text)

aws sqs create-queue \
  --queue-name lumina-webhooks \
  --attributes "VisibilityTimeout=600,\
RedrivePolicy={\"deadLetterTargetArn\":\"$DLQ_WH_ARN\",\"maxReceiveCount\":\"5\"}" \
  --region us-west-2
```

---

## 3. Lambda Layer — ffmpeg (solo para poller)

El poller necesita ffmpeg para concatenar N-1 clips con xfade.

**Opción A (recomendada) — Layer público de la comunidad:**

```bash
# Buscar layer ffmpeg para Python 3.12 / Amazon Linux 2023 en us-west-2
# Repositorio de referencia: https://github.com/nicholasgasior/aws-lambda-ffmpeg-layer
# O usar: https://serverlessrepo.aws.amazon.com/applications (buscar "ffmpeg-lambda-layer")

# Una vez obtenido el ARN del layer:
FFMPEG_LAYER_ARN="arn:aws:lambda:us-west-2:<account-id>:layer:ffmpeg:1"
```

**Opción B — Compilar y publicar propio:**

```bash
# Descargar ffmpeg estático para Amazon Linux 2023
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar xf ffmpeg-release-amd64-static.tar.xz
mkdir -p ffmpeg-layer/bin
cp ffmpeg-release-*/ffmpeg ffmpeg-layer/bin/
cd ffmpeg-layer && zip -r ../ffmpeg-layer.zip bin/
aws lambda publish-layer-version \
  --layer-name lumina-ffmpeg \
  --description "ffmpeg static binary for Python 3.12 Amazon Linux 2023" \
  --zip-file fileb://../ffmpeg-layer.zip \
  --compatible-runtimes python3.12 \
  --region us-west-2
```

---

## 4. IAM Role — lumina-lambda-role

```bash
# Crear role con trust policy para Lambda
aws iam create-role \
  --role-name lumina-lambda-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Política de permisos mínimos (least privilege)
aws iam put-role-policy \
  --role-name lumina-lambda-role \
  --policy-name lumina-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "BedrockAsyncInvoke",
        "Effect": "Allow",
        "Action": ["bedrock:StartAsyncInvoke", "bedrock:GetAsyncInvoke"],
        "Resource": "*",
        "Condition": {
          "StringEquals": {"aws:RequestedRegion": "us-west-2"}
        }
      },
      {
        "Sid": "S3Access",
        "Effect": "Allow",
        "Action": ["s3:PutObject", "s3:GetObject", "s3:HeadObject", "s3:GeneratePresignedUrl"],
        "Resource": [
          "arn:aws:s3:::lumina-inputs/*",
          "arn:aws:s3:::lumina-outputs/*"
        ]
      },
      {
        "Sid": "SQSAccess",
        "Effect": "Allow",
        "Action": [
          "sqs:SendMessage", "sqs:ReceiveMessage",
          "sqs:DeleteMessage", "sqs:GetQueueAttributes"
        ],
        "Resource": [
          "arn:aws:sqs:us-west-2:<account-id>:lumina-jobs.fifo",
          "arn:aws:sqs:us-west-2:<account-id>:lumina-webhooks"
        ]
      },
      {
        "Sid": "CloudWatch",
        "Effect": "Allow",
        "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents",
                   "cloudwatch:PutMetricData"],
        "Resource": "*"
      }
    ]
  }'

# Adjuntar policy básica de Lambda
aws iam attach-role-policy \
  --role-name lumina-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

---

## 5. Lambda Functions (us-west-2)

```bash
ROLE_ARN=$(aws iam get-role --role-name lumina-lambda-role \
  --query 'Role.Arn' --output text)

# lumina-api
aws lambda create-function \
  --function-name lumina-api \
  --runtime python3.12 \
  --handler main.handler \
  --role "$ROLE_ARN" \
  --zip-file fileb://lambda.zip \
  --timeout 30 \
  --memory-size 512 \
  --region us-west-2

# lumina-worker
aws lambda create-function \
  --function-name lumina-worker \
  --runtime python3.12 \
  --handler worker.handler \
  --role "$ROLE_ARN" \
  --zip-file fileb://lambda.zip \
  --timeout 300 \
  --memory-size 512 \
  --region us-west-2

# SQS event source mapping para worker
aws lambda create-event-source-mapping \
  --function-name lumina-worker \
  --event-source-arn arn:aws:sqs:us-west-2:<account-id>:lumina-jobs.fifo \
  --batch-size 1 \
  --region us-west-2

# lumina-poller (con ffmpeg layer)
aws lambda create-function \
  --function-name lumina-poller \
  --runtime python3.12 \
  --handler poller.handler \
  --role "$ROLE_ARN" \
  --zip-file fileb://lambda.zip \
  --timeout 300 \
  --memory-size 1024 \
  --layers "$FFMPEG_LAYER_ARN" \
  --region us-west-2

# lumina-webhook
aws lambda create-function \
  --function-name lumina-webhook \
  --runtime python3.12 \
  --handler webhook.handler \
  --role "$ROLE_ARN" \
  --zip-file fileb://lambda.zip \
  --timeout 30 \
  --memory-size 256 \
  --region us-west-2

# SQS event source mapping para webhook dispatcher
aws lambda create-event-source-mapping \
  --function-name lumina-webhook \
  --event-source-arn arn:aws:sqs:us-west-2:<account-id>:lumina-webhooks \
  --batch-size 1 \
  --region us-west-2
```

---

## 6. EventBridge Scheduler — poller cada 60s

```bash
POLLER_ARN=$(aws lambda get-function \
  --function-name lumina-poller \
  --query 'Configuration.FunctionArn' --output text)

# Crear schedule group
aws scheduler create-schedule-group \
  --name lumina \
  --region us-west-2

# Crear schedule rate(1 minute) → poller
aws scheduler create-schedule \
  --name lumina-poller \
  --group-name lumina \
  --schedule-expression "rate(1 minute)" \
  --target "{\"Arn\": \"$POLLER_ARN\", \"RoleArn\": \"$ROLE_ARN\", \"Input\": \"{}\"}" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --region us-west-2
```

---

## 7. Variables de entorno de cada Lambda

Setear una vez creadas las Lambdas:

```bash
QUEUE_URL_JOBS=https://sqs.us-west-2.amazonaws.com/<account-id>/lumina-jobs.fifo
QUEUE_URL_WEBHOOKS=https://sqs.us-west-2.amazonaws.com/<account-id>/lumina-webhooks

for fn in lumina-api lumina-worker lumina-poller lumina-webhook; do
  aws lambda update-function-configuration \
    --function-name "$fn" \
    --environment "Variables={
      SUPABASE_URL=https://<project-ref>.supabase.co,
      SUPABASE_SERVICE_KEY=<service_role_key>,
      AWS_REGION=us-west-2,
      S3_UPLOAD_BUCKET=lumina-inputs,
      S3_OUTPUT_BUCKET=lumina-outputs,
      TOUR_JOBS_QUEUE_URL=$QUEUE_URL_JOBS,
      WEBHOOK_QUEUE_URL=$QUEUE_URL_WEBHOOKS,
      BEDROCK_REGION=us-west-2,
      BEDROCK_MODEL_ID=luma.ray-v2:0,
      BEDROCK_PRICE_PER_SECOND=1.50,
      CLIP_DURATION_SECS=9,
      VIDEO_RESOLUTION=720p,
      VIDEO_MODEL_BACKEND=luma_ray2,
      TOUR_GENERATION_TIMEOUT_MINUTES=25,
      ADMIN_API_KEY=<strong-random-secret>,
      ENVIRONMENT=production,
      LOG_LEVEL=INFO
    }" \
    --region us-west-2
done
```

---

## 8. CloudWatch Alarms (observabilidad, B-11)

```bash
# Alarma DLQ jobs
aws cloudwatch put-metric-alarm \
  --alarm-name "LUMINA-DLQ-Jobs-HasMessages" \
  --metric-name "ApproximateNumberOfMessagesVisible" \
  --namespace "AWS/SQS" \
  --dimensions "Name=QueueName,Value=lumina-jobs-dlq.fifo" \
  --statistic "Maximum" \
  --period 60 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:us-west-2:<account-id>:<sns-topic>" \
  --region us-west-2

# Alarma DLQ webhooks
aws cloudwatch put-metric-alarm \
  --alarm-name "LUMINA-DLQ-Webhooks-HasMessages" \
  --metric-name "ApproximateNumberOfMessagesVisible" \
  --namespace "AWS/SQS" \
  --dimensions "Name=QueueName,Value=lumina-webhooks-dlq" \
  --statistic "Maximum" \
  --period 60 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:us-west-2:<account-id>:<sns-topic>" \
  --region us-west-2
```

---

## 9. API Gateway (us-west-2)

```bash
# HTTP API (más barato, soporte nativo Lambda proxy)
aws apigatewayv2 create-api \
  --name lumina-api \
  --protocol-type HTTP \
  --region us-west-2

# Integración con la Lambda lumina-api
# (configurar desde consola o con aws apigatewayv2 create-integration)
```

---

## Secrets en GitHub Actions

Configurar en el repositorio GitHub:

| Secret | Valor |
|--------|-------|
| `LUMINA_AWS_ACCESS_KEY_ID` | Access key de un IAM user con permiso `lambda:UpdateFunctionCode` |
| `LUMINA_AWS_SECRET_ACCESS_KEY` | Secret key correspondiente |
| `LUMINA_LAMBDA_EXECUTION_ROLE_ARN` | ARN de `lumina-lambda-role` |
