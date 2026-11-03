from rest_framework.exceptions import APIException
from rest_framework import status

class UnprocessableEntity(APIException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Unprocessable entity."
    default_code = "unprocessable_entity"

class ConflictError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Conflict: Resource version mismatch."
    default_code = "conflict"

class BadGateway(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "Bad Gateway: Upstream escalation target service error."
    default_code = "bad_gateway"

