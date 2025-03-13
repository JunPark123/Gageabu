// CDlg_Add_List.cpp: 구현 파일
//

#include "pch.h"
#include "HAB.h"
#include "afxdialogex.h"
#include "CDlg_Add_List.h"


// CDlg_Add_List 대화 상자

IMPLEMENT_DYNAMIC(CDlg_Add_List, CDialogEx)

CDlg_Add_List::CDlg_Add_List(CWnd* pParent /*=nullptr*/)
	: CDialogEx(IDD_DIG_ADD_LIST, pParent)
{

}

CDlg_Add_List::~CDlg_Add_List()
{
}

void CDlg_Add_List::DoDataExchange(CDataExchange* pDX)
{
	CDialogEx::DoDataExchange(pDX);
}


BEGIN_MESSAGE_MAP(CDlg_Add_List, CDialogEx)
	ON_BN_CLICKED(IDC_BUTTON_OK, &CDlg_Add_List::OnBnClickedButtonOk)
END_MESSAGE_MAP()


// CDlg_Add_List 메시지 처리기

void CDlg_Add_List::OnBnClickedButtonOk()
{
	// TODO: 여기에 컨트롤 알림 처리기 코드를 추가합니다.
}
