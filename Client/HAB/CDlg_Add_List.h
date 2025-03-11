#pragma once
#include "afxdialogex.h"


// CDlg_Add_List 대화 상자

class CDlg_Add_List : public CDialogEx
{
	DECLARE_DYNAMIC(CDlg_Add_List)

public:
	CDlg_Add_List(CWnd* pParent = nullptr);   // 표준 생성자입니다.
	virtual ~CDlg_Add_List();

// 대화 상자 데이터입니다.
#ifdef AFX_DESIGN_TIME
	enum { IDD = IDD_DIG_ADD_LIST };
#endif

protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV 지원입니다.

	DECLARE_MESSAGE_MAP()
};
