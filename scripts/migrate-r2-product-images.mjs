import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env") });

const BUCKET = process.env.S3_BUCKET;
const TARGET_PREFIX = "media/product/";

const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

async function listRootFiles() {
  const files = [];
  let token;
  do {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: "",
      Delimiter: "/",
      ContinuationToken: token,
    }));
    for (const obj of result.Contents || []) {
      if (obj.Key && !obj.Key.startsWith("brand/") && !obj.Key.startsWith("media/") && !obj.Key.endsWith("/")) {
        files.push(obj.Key);
      }
    }
    token = result.NextContinuationToken;
  } while (token);
  return files;
}

const files = await listRootFiles();
console.log(`Found ${files.length} root-level files to migrate`);

for (const key of files) {
  const targetKey = `${TARGET_PREFIX}${key}`;
  console.log(`  Moving ${key} \u2192 ${targetKey}`);
  await s3.send(new CopyObjectCommand({
    Bucket: BUCKET,
    CopySource: `${BUCKET}/${key}`,
    Key: targetKey,
  }));
  await s3.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

console.log("Done. All product images migrated to media/product/");
