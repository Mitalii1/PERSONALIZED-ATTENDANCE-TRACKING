import pymysql
import os
from dotenv import load_dotenv
from pymysql.cursors import DictCursor

load_dotenv()


def get_connection():
    return pymysql.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DB", "attendance_db"),
        cursorclass=pymysql.cursors.DictCursor,
    )
