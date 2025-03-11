#include "pch.h"
#include "CMainHAB.h"

CMainHAB::CMainHAB() :
	m_pDB(NULL),
	m_list(NULL),
	m_pAddList(NULL)
{
	m_pDB = new CDataBase;
}

CMainHAB::~CMainHAB()
{
	delete m_pDB;
	delete m_pAddList;
}

void CMainHAB::SetListControl(CListCtrl* list)
{
	m_list = list;
}

void CMainHAB::TreeDBClick(CString str)
{

	if (str.Compare(_T("입력")) == 0) // 입력
	{
		AddList();
	}
	else if (str.Compare(_T("월")) == 0) // 조회
	{
		SelectMonth();
	}
	else if (str.Compare(_T("요일")) == 0) // 조회
	{
		SelectDayOfWeek();
	}
	else if (str.Compare(_T("선택 내역")) == 0) // 삽입
	{
		InsertCheck();
	}
	else if (str.Compare(_T("현재 날짜")) == 0) // 삽입
	{
		InsertDay();
	}
}

void CMainHAB::AddList()
{
	m_pAddList->ShowWindow(SW_SHOW);
}

void CMainHAB::SelectMonth()
{
}

void CMainHAB::SelectDayOfWeek()
{
}

void CMainHAB::SelectOneDay()
{
	m_pDB->Select();
}

void CMainHAB::InsertCheck()
{
}

void CMainHAB::InsertDay()
{
}



