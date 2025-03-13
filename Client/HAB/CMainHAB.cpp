#include "pch.h"
#include "CMainHAB.h"

CMainHAB::CMainHAB() :
	m_list(NULL),
	m_pAddList(NULL)
{
}

CMainHAB::~CMainHAB()
{

	delete m_pAddList;
}

void CMainHAB::SetListControl(CListCtrl* list)
{
	m_list = list;
}

void CMainHAB::TreeDBClick(CString str)
{

	if (str.Compare(_T("�Է�")) == 0) // �Է�
	{
		AddList();
	}
	else if (str.Compare(_T("��")) == 0) // ��ȸ
	{
		SelectMonth();
	}
	else if (str.Compare(_T("����")) == 0) // ��ȸ
	{
		SelectDayOfWeek();
	}
	else if (str.Compare(_T("���� ����")) == 0) // ����
	{
		InsertCheck();
	}
	else if (str.Compare(_T("���� ��¥")) == 0) // ����
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
}

void CMainHAB::InsertCheck()
{
}

void CMainHAB::InsertDay()
{
}



