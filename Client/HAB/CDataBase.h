#pragma once
#include "mysql.h"
#pragma comment(lib, "libmysql.lib")

class CDataBase
{
public:
	typedef struct _DB_Columns
	{
		CString db_Day_Key;
		CString db_Time;
		int db_Id_Key;
		CString db_detail;
		int db_Paid_In;
		int db_Paid_Out;
	}DB_Columns;

public:
	CDataBase();
	~CDataBase();

	MYSQL* m_Mysql;
	MYSQL* m_pConnect;
	MYSQL_RES* m_Result;
	MYSQL_ROW m_Row;

	void Connect();
	void Disconnect();

	int Insert();
	int SelectDay(CString strKeyDay);
	int Select_Find(CString strKeyDay);
	int DeleteTuple(CString deleteKeyDay, int deleteKeyNum, int Size);
};

