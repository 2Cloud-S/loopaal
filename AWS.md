# AWS — DynamoDB Setup

## Required environment

```bash
LOOPAAL_STORE=dynamodb
LOOPAAL_TABLE_NAME=loopaal-h0
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_SESSION_TOKEN=... # optional
```

## Table

Table name: `loopaal-h0`

Primary key:

- partition key: `pk` string
- sort key: `sk` string

Global secondary indexes:

- `gsi1`: partition key `gsi1pk`, sort key `gsi1sk`
- `gsi2`: partition key `gsi2pk`, sort key `gsi2sk`

## AWS CLI create-table

```bash
aws dynamodb create-table \
  --table-name loopaal-h0 \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
    AttributeName=gsi1pk,AttributeType=S \
    AttributeName=gsi1sk,AttributeType=S \
    AttributeName=gsi2pk,AttributeType=S \
    AttributeName=gsi2sk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
  --global-secondary-indexes \
    "IndexName=gsi1,KeySchema=[{AttributeName=gsi1pk,KeyType=HASH},{AttributeName=gsi1sk,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
    "IndexName=gsi2,KeySchema=[{AttributeName=gsi2pk,KeyType=HASH},{AttributeName=gsi2sk,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
  --billing-mode PAY_PER_REQUEST
```

## Devpost proof screenshot

Capture one screenshot that clearly shows:

- AWS DynamoDB table name.
- Item count or visible records.
- `pk`, `sk`, and one GSI attribute.
- Region in the AWS console.
