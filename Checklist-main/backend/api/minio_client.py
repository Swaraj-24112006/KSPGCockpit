import io
import re
import json
import base64
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from django.conf import settings

_s3_client = None
_storage_config = None


def get_storage_config():
    global _storage_config
    if _storage_config is not None:
        return _storage_config

    try:
        with open(settings.MASTER_CONFIG_PATH, 'r') as f:
            cfg = json.load(f)
            _storage_config = cfg.get('storage', {})
    except Exception:
        _storage_config = {
            'endpoint': 'http://127.0.0.1:9000',
            'bucket': 'tpm-evidence',
            'region': 'us-east-1',
            'accessKey': 'minioadmin',
            'secretKey': 'minioadmin',
            'publicBaseUrl': 'http://127.0.0.1:9000/tpm-evidence',
            'objectPrefix': 'evidence/',
        }
    return _storage_config


def get_s3_client():
    global _s3_client
    if _s3_client is not None:
        return _s3_client

    cfg = get_storage_config()
    _s3_client = boto3.client(
        's3',
        endpoint_url=cfg.get('endpoint', 'http://127.0.0.1:9000'),
        aws_access_key_id=cfg.get('accessKey', 'minioadmin'),
        aws_secret_access_key=cfg.get('secretKey', 'minioadmin'),
        region_name=cfg.get('region', 'us-east-1'),
        config=Config(s3={'addressing_style': 'path'}, signature_version='s3v4'),
    )
    return _s3_client


def ensure_bucket_exists():
    client = get_s3_client()
    cfg = get_storage_config()
    bucket = cfg.get('bucket', 'tpm-evidence')

    try:
        client.head_bucket(Bucket=bucket)
        return False  # Already exists
    except ClientError as err:
        error_code = err.response.get('Error', {}).get('Code')
        if error_code in ['404', 'NoSuchBucket']:
            client.create_bucket(Bucket=bucket)
            # Set bucket policy to allow read if needed
            return True
        return False
    except Exception as e:
        print(f"Warning: MinIO ensure_bucket_exists failed: {e}")
        return False


def upload_evidence(object_key, data, content_type='image/jpeg', metadata=None):
    client = get_s3_client()
    cfg = get_storage_config()
    bucket = cfg.get('bucket', 'tpm-evidence')
    prefix = cfg.get('objectPrefix', 'evidence/')

    # Handle base64
    if isinstance(data, str):
        match = re.match(r'^data:[^;]+;base64,(.+)$', data)
        if match:
            raw_bytes = base64.b64decode(match.group(1))
        else:
            raw_bytes = base64.b64decode(data)
    else:
        raw_bytes = data

    if not object_key.startswith(prefix) and not object_key.startswith('reference/'):
        full_key = f"{prefix}{object_key}"
    else:
        full_key = object_key

    s3_meta = {}
    if metadata:
        for k, v in metadata.items():
            clean_k = re.sub(r'([A-Z])', r'-\1', k).lower()
            s3_meta[clean_k] = str(v)

    client.put_object(
        Bucket=bucket,
        Key=full_key,
        Body=raw_bytes,
        ContentType=content_type,
        Metadata=s3_meta,
    )

    public_base = cfg.get('publicBaseUrl', f"http://127.0.0.1:9000/{bucket}")
    return {
        'key': full_key,
        'bucket': bucket,
        'url': f"{public_base}/{full_key}",
    }


def check_minio_health():
    client = get_s3_client()
    cfg = get_storage_config()
    bucket = cfg.get('bucket', 'tpm-evidence')

    try:
        client.head_bucket(Bucket=bucket)
        # Count objects
        response = client.list_objects_v2(Bucket=bucket, MaxKeys=1000)
        object_count = response.get('KeyCount', 0)
        return {
            'connected': True,
            'bucket': bucket,
            'endpoint': cfg.get('endpoint'),
            'objectCount': object_count,
        }
    except Exception as err:
        return {
            'connected': False,
            'bucket': bucket,
            'endpoint': cfg.get('endpoint'),
            'error': str(err),
            'objectCount': 0,
        }
