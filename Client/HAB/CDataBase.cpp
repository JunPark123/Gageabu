#include "pch.h"
#include "CDataBase.h"

#define CON_IP "192.168.219.108"
#define DB_PASS "0114"
#define DB_NAME "HAB"


CDataBase::CDataBase()
	:m_pConnect(NULL)
{
}


CDataBase::~CDataBase()
{
	Disconnect();
}


void CDataBase::Connect()
{
	if (m_pConnect != NULL) {
		printf("connect");
		return;
	}
	try {
		m_Mysql = mysql_init(NULL);
		if (!m_Mysql) throw - 1;
		m_pConnect = mysql_real_connect(m_Mysql, CON_IP, "root", "DB_PASS", "DB_NAME", 3306, NULL, 0);
		if (m_pConnect == NULL) throw - 2;
	}
	catch (int expn) {
		CString str = _T("");
		switch (expn) {
		case -1:	str = _T("mysql init false\n");		break;
		case -2:	str = _T("mysql connect false\n");	break;
		}
		
		AfxMessageBox(str, MB_OK);
		return;
	}
	return;
}

void CDataBase::Disconnect()
{
	if (m_pConnect != NULL) {
		mysql_close(m_Mysql);
		m_pConnect = NULL;
	}
}

int CDataBase::Insert(DB_Columns db)
{
	if (m_pConnect == NULL)
	{
		printf("Disconnected!\n");
		return -100;
	}
	try {
		char* stat = "INSERT INTO HAB_Main (day, time, detail, paid_in, paid_out) VALUES (";

		int query_size = strlen(stat) 
			+ strlen((CStringA)db.db_Day_Key)
			+ strlen((CStringA)db.db_Time)
			+ strlen((CStringA)db.db_detail)
			+ strlen((CStringA)db.db_Paid_In)
			+ strlen((CStringA)db.db_Paid_Out)
			+ 1;
		
		char* query = new char[query_size];

		snprintf(query, query_size, stat, strKeyDay);

		if (mysql_query(m_mysql, query) != 0) throw - 1;
		delete[] query;		query = NULL;

		m_Result = mysql_store_result(m_mysql);

		m_Row = mysql_fetch_row(m_Result);
		if (m_Row == NULL) throw - 2;

		unsigned long* lengths = mysql_fetch_lengths(m_Result);

		double* ref, * data;
		//dhpark
		double* data2, * data3;

		*size = atoi(m_Row[0]);
		ref = new double[*size];
		data = new double[*size];

		//dhpark
		data2 = new double[*size];
		data3 = new double[*size];

		memcpy(ref, m_Row[1], lengths[1]);
		memcpy(data, m_Row[2], lengths[2]);

		//dhpark
		memcpy(data2, m_Row[3], lengths[3]);
		memcpy(data3, m_Row[4], lengths[4]);

		*Ref = ref;
		*Data = data;
		//dhpark
		*Data2 = data2;
		*Data3 = data3;

		mysql_free_result(m_Result);
	}
	catch (int expn) {
		switch (expn) {
		case -1:
			printf("mysql Select_Data mysql_query false\n");
			break;
		case -2:
			printf("mysql Select_Data mysql_fetch_row false\n");
			break;
		}
		return expn;
	}
	return 0;
}

int CDataBase::SelectDay(CString strKeyDay)
{
	if (m_pConnect == NULL)
	{
		printf("Disconnected!\n");
		return -100;
	}

	//mysql_query(&m_mysql, "Select * from HAB_Main");
	//mysql_store_result(&m_mysql);

	try {
		char* stat = "select day, time, id, detail, paid_in, paid_out from HAB_Main where day = '%s'";

		int query_size = strlen(stat) + strlen((CStringA)strKeyDay) + 1;
		char* query = new char[query_size];

		snprintf(query, query_size, stat, strKeyDay);

		if (mysql_query(m_mysql, query) != 0) throw - 1;
		delete[] query;		query = NULL;

		m_Result = mysql_store_result(m_mysql);

		m_Row = mysql_fetch_row(m_Result);
		if (m_Row == NULL) throw - 2;

		unsigned long* lengths = mysql_fetch_lengths(m_Result);

		double* ref, * data;
		//dhpark
		double* data2, * data3;

		*size = atoi(m_Row[0]);
		ref = new double[*size];
		data = new double[*size];

		//dhpark
		data2 = new double[*size];
		data3 = new double[*size];

		memcpy(ref, m_Row[1], lengths[1]);
		memcpy(data, m_Row[2], lengths[2]);

		//dhpark
		memcpy(data2, m_Row[3], lengths[3]);
		memcpy(data3, m_Row[4], lengths[4]);

		*Ref = ref;
		*Data = data;
		//dhpark
		*Data2 = data2;
		*Data3 = data3;

		mysql_free_result(m_Result);
	}
	catch (int expn) {
		switch (expn) {
		case -1:
			printf("mysql Select_Data mysql_query false\n");
			break;
		case -2:
			printf("mysql Select_Data mysql_fetch_row false\n");
			break;
		}
		return expn;
	}
	return 0;

}

int CDataBase::Select_Find(CString strKeyDay)
{
	if (m_pConnect == NULL)
	{
		printf("Disconnected!\n");
		return -100;
	}
	try {
		char* stat = "select day, time, id, detail, paid_in, paid_out from HAB_Main where day = '%s'";

		int query_size = strlen(stat) + strlen((CStringA)strKeyDay) + 1;
		char* query = new char[query_size];

		snprintf(query, query_size, stat, strKeyDay);

		if (mysql_query(m_Mysql, query) != 0) throw - 1;
		delete[] query;		query = NULL;

		m_Result = mysql_store_result(m_Mysql);
		int nSize = mysql_num_rows(m_Result);

		DB_Columns* Get_Data = new DB_Columns[nSize];

		int index = 0;
		while ((m_Row = mysql_fetch_row(m_Result)) != NULL) {
			Get_Data[index].db_Day_Key = m_Row[0];
			Get_Data[index].db_Time = m_Row[1];
			Get_Data[index].db_Id_Key = atoi(m_Row[2]);
			Get_Data[index].db_detail = m_Row[3];
			Get_Data[index].db_Paid_In = atoi(m_Row[4]);
			Get_Data[index].db_Paid_Out = atoi(m_Row[5]);

			index++;
		}
		mysql_free_result(m_Result);
		*Qbox_Data = Get_Data;
	}
	catch (int expn) {
		switch (expn) {
		case -1:
			printf("mysql Select false\n");
			break;
		}
		return expn;
	}
	return 0;
	

}



int CDataBase::DeleteTuple(CString strDeleteKeyDay, int nDeleteKeyNum, int nSize)
{
	if (m_pConnect == NULL)
	{
		printf("Disconnected!\n");
		return -100;
	}
	try {
		for (int i = 0; i < nSize; i++) {
			char* stat = "delete from Qbox_Data where Time like '%s'";

			int query_size = strlen(stat) + strlen(deleteKey[i].c_str()) + 1;
			char* query = new char[query_size];

			snprintf(query, query_size, stat, deleteKey[i].c_str());

			if (mysql_query(m_Mysql, query) != 0) throw - 1;
			delete[] query;		query = NULL;
		}
	}
	catch (int expn) {
		switch (expn) {
		case -1:
			printf("mysql DeleteTuple false\n");
			break;
		}
		return expn;
	}
	return 0;
}



/*
int CDataBase::Data_Count(int* Count)
{
	if (m_pConnect == NULL)
	{
		printf("Disconnected!\n");
		return -100;
	}
	try {
		char* stat = "select count(*) from Qbox_Data";

		int query_size = strlen(stat) + 1;
		char* query = new char[query_size];

		snprintf(query, query_size, stat);

		if (mysql_query(m_Mysql, query) != 0) throw - 1;
		delete[] query;		query = NULL;

		m_Result = mysql_store_result(m_Mysql);

		if ((m_Row = mysql_fetch_row(m_Result)) != NULL) {
			*Count = atoi(m_Row[0]);
		}
		mysql_free_result(m_Result);
	}
	catch (int expn) {
		switch (expn) {
		case -1:
			printf("mysql Select Data_Count false\n");
			break;
		}
		return expn;
	}
	return 0;
}

*/