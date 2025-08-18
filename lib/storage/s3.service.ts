import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_RESUME_BUCKET || "jobseek-resumes";

export interface ResumeUpload {
  userId: string;
  resumeId: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  s3Key: string;
}

export class S3Service {
  // Generate a pre-signed URL for uploading a resume
  async getUploadUrl(
    userId: string,
    filename: string,
    contentType: string
  ): Promise<{ uploadUrl: string; s3Key: string }> {
    const resumeId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const s3Key = `resumes/${userId}/${resumeId}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    }); // 1 hour

    return { uploadUrl, s3Key };
  }

  // Generate a pre-signed URL for downloading a resume
  async getDownloadUrl(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
  }

  // Upload a resume directly (for server-side uploads)
  async uploadResume(
    userId: string,
    filename: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<ResumeUpload> {
    const resumeId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const s3Key = `resumes/${userId}/${resumeId}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: {
        userId,
        filename,
        uploadedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    return {
      userId,
      resumeId,
      filename,
      contentType,
      size: fileBuffer.length,
      uploadedAt: new Date().toISOString(),
      s3Key,
    };
  }

  // Delete a resume
  async deleteResume(s3Key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    await s3Client.send(command);
  }

  // List all resumes for a user
  async listUserResumes(
    userId: string
  ): Promise<{ key: string; size: number; lastModified: Date }[]> {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `resumes/${userId}/`,
    });

    const response = await s3Client.send(command);

    return (response.Contents || []).map((item) => ({
      key: item.Key!,
      size: item.Size || 0,
      lastModified: item.LastModified || new Date(),
    }));
  }

  // Generate a public URL for sharing (temporary)
  async getPublicUrl(
    s3Key: string,
    expiresInDays: number = 7
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    return await getSignedUrl(s3Client, command, {
      expiresIn: expiresInDays * 24 * 60 * 60, // Convert days to seconds
    });
  }
}

export const s3Service = new S3Service();
