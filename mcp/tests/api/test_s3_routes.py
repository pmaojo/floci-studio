import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from floci_backend.server import app

client = TestClient(app)

@patch('floci_backend.api.s3_routes.boto3.client')
def test_export_empty_bucket(mock_boto3_client):
    # Setup mock
    mock_s3 = MagicMock()
    mock_boto3_client.return_value = mock_s3

    # Mock paginator to return empty
    mock_paginator = MagicMock()
    mock_paginator.paginate.return_value = []
    mock_s3.get_paginator.return_value = mock_paginator

    response = client.get("/api/s3/buckets/my-empty-bucket/export")
    assert response.status_code == 400
    assert response.json()["error"] == "Bucket is empty"

@patch('floci_backend.api.s3_routes.boto3.client')
def test_export_bucket(mock_boto3_client):
    mock_s3 = MagicMock()
    mock_boto3_client.return_value = mock_s3

    mock_paginator = MagicMock()
    mock_paginator.paginate.return_value = [{"Contents": [{"Key": "test.txt"}]}]
    mock_s3.get_paginator.return_value = mock_paginator

    mock_s3.get_object.return_value = {"Body": MagicMock(read=lambda: b"hello world")}

    response = client.get("/api/s3/buckets/my-bucket/export")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert "attachment; filename=my-bucket-export.zip" in response.headers["content-disposition"]

def test_import_bucket_invalid_file():
    response = client.post(
        "/api/s3/buckets/my-bucket/import",
        files={"file": ("test.txt", b"not a zip", "text/plain")}
    )
    assert response.status_code == 400
    assert response.json()["error"] == "File must be a ZIP archive"
