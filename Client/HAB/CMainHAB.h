#pragma once
#include "CDlg_Add_List.h"
#include "pch.h"
#include "framework.h"
#include "afxdialogex.h"
#include <winhttp.h>
#include <string>
#include "json.hpp"

using json = nlohmann::json;

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

	std::wstring HttpRequest(const std::wstring& method, const std::wstring& endpoint, const std::wstring& jsonData = L"");
};

