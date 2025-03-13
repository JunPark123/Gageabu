#pragma once
#include "CDlg_Add_List.h"

class CMainHAB
{
public:
	CMainHAB();
	~CMainHAB();

	CDlg_Add_List* m_pAddList;

	CListCtrl* m_list;
	void SetListControl(CListCtrl* list);

	void TreeDBClick(CString str);
	void AddList();
	void SelectMonth();
	void SelectDayOfWeek();
	void SelectOneDay();
	void InsertCheck();
	void InsertDay();
};

