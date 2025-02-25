from typing import List
from lib.query_analysis.create_table.base_create_table import BaseCreateTable
from lib.table_upload.common import UploadTableColumnType
from lib.query_analysis.create_table.helper import is_custom_column_type

UPLOAD_COL_TYPE_TO_HIVE_TYPE = {
    UploadTableColumnType.BOOLEAN: "BOOLEAN",
    UploadTableColumnType.DATETIME: "DATE",
    UploadTableColumnType.FLOAT: "DOUBLE",
    UploadTableColumnType.INTEGER: "BIGINT",
    UploadTableColumnType.STRING: "STRING",
}


class HiveCreateTable(BaseCreateTable):
    @classmethod
    def get_language(cls) -> str:
        return "hive"

    def _get_column_defs(self) -> List[str]:
        ret = []
        for col_name, col_type in self._column_name_types:
            escaped_col_name = f"`{col_name}`"

            actual_col_type = col_type
            if not is_custom_column_type(col_type):
                upload_col_type = UploadTableColumnType(col_type)
                actual_col_type = UPLOAD_COL_TYPE_TO_HIVE_TYPE[upload_col_type]

            ret.append(f"{escaped_col_name} {actual_col_type}")
        return ret

    def _get_create_prefix(self) -> str:
        return f"CREATE EXTERNAL TABLE {self._table_name}"

    def _get_extra_properties(self) -> str:
        rows = []
        if self._format == "CSV":
            rows += [
                "ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'",
                "FIELDS TERMINATED BY ','",
                "STORED AS TEXTFILE",
                f"LOCATION '{self._file_location}'"
                'TBLPROPERTIES ("skip.header.line.count"="1")',
            ]
        elif self._format == "PARQUET":
            rows += ["STORED AS PARQUET", f"LOCATION '{self._file_location}'"]
        else:
            raise ValueError(f"Unsupported file type {self._format}")

        return "\n".join(rows)


class SparkSQLCreateTable(HiveCreateTable):
    @classmethod
    def get_language(cls) -> str:
        return "sparksql"
