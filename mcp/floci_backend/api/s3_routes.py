import io
import zipfile
import boto3
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from floci_backend.config import config

def create_s3_router() -> APIRouter:
    router = APIRouter()

    def get_s3_client():
        return boto3.client(
            's3',
            endpoint_url=config.aws_endpoint_url,
            region_name=config.aws_region,
            aws_access_key_id=config.aws_access_key_id,
            aws_secret_access_key=config.aws_secret_access_key
        )

    @router.get('/s3/buckets/{bucket_name}/export')
    def export_bucket(bucket_name: str):
        try:
            s3 = get_s3_client()

            # List all objects in the bucket
            paginator = s3.get_paginator('list_objects_v2')
            objects = []
            try:
                for page in paginator.paginate(Bucket=bucket_name):
                    if 'Contents' in page:
                        for obj in page['Contents']:
                            objects.append(obj['Key'])
            except s3.exceptions.NoSuchBucket:
                raise HTTPException(status_code=404, detail="Bucket not found")

            if not objects:
                raise HTTPException(status_code=400, detail="Bucket is empty")

            # Create a zip file in memory
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
                for obj_key in objects:
                    # Don't try to download directory markers
                    if obj_key.endswith('/'):
                        continue

                    response = s3.get_object(Bucket=bucket_name, Key=obj_key)
                    file_content = response['Body'].read()
                    zip_file.writestr(obj_key, file_content)

            zip_buffer.seek(0)

            return StreamingResponse(
                zip_buffer,
                media_type="application/zip",
                headers={
                    "Content-Disposition": f"attachment; filename={bucket_name}-export.zip"
                }
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post('/s3/buckets/{bucket_name}/import')
    def import_bucket(bucket_name: str, file: UploadFile = File(...)):
        if not file.filename.endswith('.zip'):
            raise HTTPException(status_code=400, detail="File must be a ZIP archive")

        try:
            s3 = get_s3_client()

            # Read zip file into memory (synchronously)
            contents = file.file.read()
            zip_buffer = io.BytesIO(contents)

            # Verify bucket exists, if not create it
            try:
                s3.head_bucket(Bucket=bucket_name)
            except:
                s3.create_bucket(Bucket=bucket_name)

            with zipfile.ZipFile(zip_buffer, "r") as zip_file:
                for file_info in zip_file.infolist():
                    # Skip directories and __MACOSX meta folders
                    if file_info.is_dir() or file_info.filename.startswith('__MACOSX/') or file_info.filename.endswith('/.DS_Store'):
                        continue

                    with zip_file.open(file_info) as extracted_file:
                        s3.put_object(
                            Bucket=bucket_name,
                            Key=file_info.filename,
                            Body=extracted_file.read()
                        )

            return {"status": "success", "message": f"Successfully imported {file.filename} into {bucket_name}"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return router
