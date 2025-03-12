namespace GagebuShared
{
    public class GagebuTransaction
    {
        public int Id { get; set; }
        public string Description { get; set; } = "";
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string Category { get; set; } = "";
    }
}
