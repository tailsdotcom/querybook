import json
from typing import Dict

from flask_login import current_user
from flask import request

from app.datasource import register
from app.auth.permission import (
    verify_query_engine_permission,
    verify_query_execution_permission,
)
from lib.table_upload.importer.importer_factory import get_importer
from lib.table_upload.exporter.exporter_factory import get_exporter


@register("/table_upload/preview/", methods=["POST"])
def get_upload_rows_preview():
    import_config = json.loads(request.form["import_config"])
    file_uploaded = request.files.get("file")
    verify_import_config_permissions(import_config)

    importer = get_importer(import_config, file_uploaded)
    return importer.get_columns()


@register("/table_upload/", methods=["POST"])
def perform_table_upload():
    import_config = json.loads(request.form["import_config"])
    file_uploaded = request.files.get("file")
    verify_import_config_permissions(import_config)

    table_config = json.loads(request.form["table_config"])
    engine_id = request.form["engine_id"]
    verify_query_engine_permission(engine_id)

    importer = get_importer(import_config, file_uploaded)
    exporter = get_exporter(engine_id, current_user.id, table_config, importer)
    return exporter.upload()


def verify_import_config_permissions(import_config: Dict):
    if "query_execution_id" in import_config:
        query_execution_id = import_config["query_execution_id"]
        verify_query_execution_permission(query_execution_id)
