using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;
using GagebuShared;

namespace GageubSimpleApp
{
    public partial class Form1 : Form
    {
        private readonly HttpClient _httpClient = new HttpClient { BaseAddress = new Uri("https://localhost:7299") };

        public Form1()
        {
            InitializeComponent();
        }

        private async void button1_Click(object sender, EventArgs e)
        {
            var transaction = new GagebuShared.GagebuTransaction
            {
                Description = txtDescription.Text,
                Amount = decimal.Parse(txtAmount.Text),
                Date = dtpDate.Value.Date.Add(DateTime.Now.TimeOfDay),
                Category = txtCategory.Text
            };


            string json = JsonSerializer.Serialize(transaction, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            });
            Console.WriteLine($" JSON 전송 데이터: {json}");
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            HttpResponseMessage response = await _httpClient.PostAsync("/api/transactions", content);
            MessageBox.Show(response.StatusCode.ToString(), "응답");
        }

        private async void button2_Click(object sender, EventArgs e)
        {
            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync("/api/transactions");
                response.EnsureSuccessStatusCode(); // 요청이 실패하면 예외 발생

                string jsonResponse = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"서버 응답: {jsonResponse}");
               
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true, // JSON 속성 이름 대소문자 구분 없이 매칭
                    Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
                };

                var transactions = JsonSerializer.Deserialize<GagebuShared.GagebuTransaction[]>(jsonResponse,options);
                listBoxTransactions.Items.Clear();
                foreach (var t in transactions)
                {
                    listBoxTransactions.Items.Add($"{t.Date} | {t.Category} | {t.Description} | {t.Amount}원");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"오류 발생: {ex.Message}", "API 요청 실패");
                Console.WriteLine($"예외: {ex}");
            }

        }
    }
}
