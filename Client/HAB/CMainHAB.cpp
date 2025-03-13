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

    // 전부 수정 필요
    /*json transaction = {
       {"description", CT2A(m_txtDescription.GetString())},
       {"amount", _tstof(m_txtAmount.GetString())},
       {"date", CT2A(m_dtDate.Format("%Y-%m-%dT%H:%M:%S"))},
       {"category", CT2A(m_txtCategory.GetString())}
    };

    std::wstring jsonData = CA2T(transaction.dump().c_str());
    std::wstring response = HttpRequest(L"POST", L"/api/transactions", jsonData);
    AfxMessageBox(response.c_str());
    */
}

void CMainHAB::SelectMonth()
{
}

void CMainHAB::SelectDayOfWeek()
{
}

void CMainHAB::SelectOneDay()
{
    std::wstring response = HttpRequest(L"GET", L"/api/transactions");
    if (response.empty()) {
        CString str; str.Format(_T("API 요청 실패"));
        AfxMessageBox(str);
        return;
    }
   
    
    json transactions = json::parse(CT2A(response.c_str()));
    m_list->DeleteAllItems();
    
    LVITEM item;
    item.mask = LVIF_TEXT;
    int count = 0;
    CString str = L"";

    for (const auto& t : transactions) {
        item.iItem = count;

        item.iSubItem = 0;
        item.pszText = CA2T(t["date"].get<std::string>().c_str());
        m_list->InsertItem(&item);

        item.iSubItem = 1;
        item.pszText = CA2T(t["category"].get<std::string>().c_str());
        m_list->SetItem(&item);

        item.iSubItem = 2;
        item.pszText = CA2T(t["description"].get<std::string>().c_str());
        m_list->SetItem(&item);

        item.iSubItem = 3;
        //item.pszText = str;//t["amount"].get<double>();
        m_list->SetItem(&item);
    }
    
}

void CMainHAB::InsertCheck()
{
}

void CMainHAB::InsertDay()
{
}



std::wstring CMainHAB::HttpRequest(const std::wstring& method, const std::wstring& endpoint, const std::wstring& jsonData/* = L""*/) {
    HINTERNET hSession = WinHttpOpen(L"HAB Client", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, NULL, NULL, 0);
    if (!hSession) return L"";

    HINTERNET hConnect = WinHttpConnect(hSession, L"localhost", 7299, 0);
    if (!hConnect) {
        WinHttpCloseHandle(hSession);
        return L"";
    }

    HINTERNET hRequest = WinHttpOpenRequest(hConnect, method.c_str(), endpoint.c_str(), NULL, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, WINHTTP_FLAG_SECURE);
    if (!hRequest) {
        WinHttpCloseHandle(hConnect);
        WinHttpCloseHandle(hSession);
        return L"";
    }

    BOOL result = TRUE;
    if (!jsonData.empty()) {
        result = WinHttpSendRequest(hRequest, L"Content-Type: application/json\r\n", 0, (LPVOID)jsonData.c_str(), jsonData.length() * sizeof(wchar_t), jsonData.length() * sizeof(wchar_t), 0);
    }
    else {
        result = WinHttpSendRequest(hRequest, WINHTTP_NO_ADDITIONAL_HEADERS, 0, NULL, 0, 0, 0);
    }

    if (!result || !WinHttpReceiveResponse(hRequest, NULL)) {
        WinHttpCloseHandle(hRequest);
        WinHttpCloseHandle(hConnect);
        WinHttpCloseHandle(hSession);
        return L"";
    }

    DWORD dwSize = 0;
    WinHttpQueryDataAvailable(hRequest, &dwSize);
    std::wstring response;
    if (dwSize > 0) {
        wchar_t* buffer = new wchar_t[dwSize / sizeof(wchar_t) + 1];
        ZeroMemory(buffer, dwSize + sizeof(wchar_t));
        DWORD dwDownloaded = 0;
        WinHttpReadData(hRequest, (LPVOID)buffer, dwSize, &dwDownloaded);
        response.assign(buffer);
        delete[] buffer;
    }

    WinHttpCloseHandle(hRequest);
    WinHttpCloseHandle(hConnect);
    WinHttpCloseHandle(hSession);
    return response;
}

