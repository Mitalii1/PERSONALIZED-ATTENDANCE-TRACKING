import pymysql
from pymysql.cursors import DictCursor


# Database configuration
DB_CONFIG = {
    "host": "127.0.0.1",      # MySQL server location
    "user": "root",           # MySQL username
    "password": "@Shan2006",           # your MySQL password (leave empty if none)
    "database": "attendance_db",   # database name you created
    "charset": "utf8mb4",
    "cursorclass": DictCursor
}


def get_connection():
    """
    This function creates a connection to MySQL.
    Whenever we want to run a query (SELECT, INSERT, UPDATE),
    we call this function.
    """

    connection = pymysql.connect(
        host=DB_CONFIG["host"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        database=DB_CONFIG["database"],
        charset=DB_CONFIG["charset"],
        cursorclass=DB_CONFIG["cursorclass"]
    )

    return connection

if __name__ == "__main__":
    conn = get_connection()
    print("Database Connected Successfully!")
    conn.close()