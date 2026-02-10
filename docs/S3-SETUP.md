# S3 configuration for file uploads

The app uploads files (insurance cards, KYP documents, pre-auth PDFs, discharge docs, chat attachments) to **Amazon S3**. Follow these steps to configure it.

---

## 1. Create an AWS account (if you don’t have one)

1. Go to [https://aws.amazon.com](https://aws.amazon.com) and sign up.
2. Complete verification (email, payment method – you can stay in free tier).

---

## 2. Create an S3 bucket

1. Log in to the [AWS Console](https://console.aws.amazon.com).
2. Open **S3** (search “S3” in the top search bar).
3. Click **Create bucket**.
4. **Bucket name**: choose a globally unique name (e.g. `mediend-crm-uploads-prod`).
5. **Region**: pick the same region you use for the app (e.g. `ap-south-1` for India). Note it for `AWS_REGION` later.
6. **Block Public Access**:  
   - For the **simplest setup** (uploaded files viewable via direct URL):  
     - **Uncheck** “Block all public access” and confirm.  
     - Then add a bucket policy in step 3 so only your upload prefix is readable.  
   - For **stricter security**: leave “Block all public access” **on**; you’ll need to serve files via presigned URLs (see “Private bucket” at the end).
7. Leave versioning and encryption as default unless you have requirements.
8. Click **Create bucket**.

---

## 3. Allow public read for uploaded objects (only if you unblocked public access)

If you want the app to use direct URLs like  
`https://your-bucket.s3.region.amazonaws.com/kyp/123-file.pdf`:

1. In S3, open your bucket → **Permissions** tab.
2. Under **Bucket policy**, click **Edit** and use a policy like this (replace `mediend-crm-uploads-prod`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadUploads",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::mediend-crm-uploads-prod/kyp/*"
    },
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::mediend-crm-uploads-prod/preauth/*",
        "arn:aws:s3:::mediend-crm-uploads-prod/discharge/*",
        "arn:aws:s3:::mediend-crm-uploads-prod/chat/*",
        "arn:aws:s3:::mediend-crm-uploads-prod/preauth-pdf/*"
      ]
    }
  ]
}
```

3. Save. This allows **read-only** access to objects under those prefixes; only your app (with IAM keys) can upload/delete.

---

## 4. Create an IAM user for the app (recommended)

1. In the AWS Console, go to **IAM** → **Users** → **Create user**.
2. **User name**: e.g. `mediend-crm-s3-uploader`.
3. **Next** → **Attach policies directly** → **Create policy** (opens new tab).
4. In the policy editor choose **JSON** and paste (replace `mediend-crm-uploads-prod`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::mediend-crm-uploads-prod/*"
    }
  ]
}
```

5. **Next** → name the policy (e.g. `MediendCrmS3Upload`) → **Create policy**.
6. Back on the “Create user” tab, refresh the policy list, select `MediendCrmS3Upload` → **Next** → **Create user**.
7. Open the new user → **Security credentials** → **Create access key**.
8. Use case: **Application running outside AWS** → **Next** → (optional) add description → **Create access key**.
9. Copy the **Access key ID** and **Secret access key** once; you can’t see the secret again.

---

## 5. Set environment variables

In your `.env` (and on the server / Docker env), set:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=<access-key-from-step-4>
AWS_SECRET_ACCESS_KEY=<secret-key-from-step-4>
AWS_S3_BUCKET_NAME=<your-bucket-name>
AWS_REGION=<bucket-region-e.g-ap-south-1>
```

Example:

```env
AWS_ACCESS_KEY_ID=AKIA....................
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_S3_BUCKET_NAME=mediend-crm-uploads-prod
AWS_REGION=ap-south-1
```

- **Never** commit real keys to git. Keep `.env` in `.gitignore`.
- On the server, use your deployment’s env (e.g. Docker `env_file` or host env).

---

## 6. Restart the app and test

1. Restart the Next.js app so it picks up the new env vars.
2. In the app: upload a file (e.g. KYP Basic → Insurance card, or any form that uses file upload).
3. If it succeeds, you’ll get a success message and the stored URL will look like:  
   `https://<bucket>.s3.<region>.amazonaws.com/kyp/<timestamp>-<filename>`.
4. Open that URL in a browser:
   - **Public bucket**: the file should load.
   - **Private bucket**: you’ll get “Access Denied” unless you switch to presigned URLs (see below).

---

## 7. Optional: Private bucket (no public read)

If you left “Block all public access” on:

- Uploads will still work (IAM user has `PutObject`).
- The URL the app returns will **not** be directly viewable.
- To show files in the UI you have two options:
  - **Option A**: Add an API route that generates a **presigned URL** from the stored S3 key and redirects or returns it. The app already has `getPresignedUrl()` in `lib/s3-client.ts`; you’d call it when the UI needs to display or download a file.
  - **Option B**: Proxy the file through your backend: an API route uses the S3 key to get the object and streams it to the client (so the browser never sees the S3 URL).

---

## Checklist

- [ ] S3 bucket created in the correct region.
- [ ] If using direct URLs: public read bucket policy for `kyp/*`, `preauth/*`, `discharge/*`, `chat/*`, `preauth-pdf/*`.
- [ ] IAM user created with PutObject/GetObject/DeleteObject on the bucket.
- [ ] Access key and secret created and copied.
- [ ] `.env` updated with `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_REGION`.
- [ ] App restarted and a test upload performed.

---

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| “AWS_S3_BUCKET_NAME environment variable is not set” | Ensure all four AWS_* vars are set in the env the server process uses (e.g. `.env` or Docker env_file). |
| “Access Denied” on upload | IAM user must have `s3:PutObject` on `arn:aws:s3:::BUCKET_NAME/*`. Bucket policy must not deny the IAM user. |
| “Access Denied” when opening file URL | For direct URLs, bucket (or prefix) must allow public `s3:GetObject`, or use presigned URLs. |
| Wrong region errors | `AWS_REGION` must match the bucket region (e.g. `ap-south-1`, `us-east-1`). |
