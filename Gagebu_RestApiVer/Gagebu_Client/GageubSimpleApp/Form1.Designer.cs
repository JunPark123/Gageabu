namespace GageubSimpleApp
{
    partial class Form1
    {
        /// <summary>
        ///  Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        ///  Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        ///  Required method for Designer support - do not modify
        ///  the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            panel1 = new Panel();
            tableLayoutPanel1 = new TableLayoutPanel();
            button1 = new Button();
            listBoxTransactions = new ListBox();
            button2 = new Button();
            panel2 = new Panel();
            tableLayoutPanel2 = new TableLayoutPanel();
            label1 = new Label();
            txtContent = new TextBox();
            label7 = new Label();
            label4 = new Label();
            txtPayType = new TextBox();
            txtCost = new TextBox();
            label3 = new Label();
            label2 = new Label();
            label6 = new Label();
            txtCategory = new TextBox();
            dtpDate = new DateTimePicker();
            lbNo = new Label();
            cmbType = new ComboBox();
            panel1.SuspendLayout();
            tableLayoutPanel1.SuspendLayout();
            panel2.SuspendLayout();
            tableLayoutPanel2.SuspendLayout();
            SuspendLayout();
            // 
            // panel1
            // 
            panel1.Controls.Add(tableLayoutPanel1);
            panel1.Dock = DockStyle.Fill;
            panel1.Location = new Point(0, 0);
            panel1.Margin = new Padding(6);
            panel1.Name = "panel1";
            panel1.Size = new Size(1600, 960);
            panel1.TabIndex = 0;
            // 
            // tableLayoutPanel1
            // 
            tableLayoutPanel1.ColumnCount = 4;
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 56.7107735F));
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 43.2892265F));
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 288F));
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 252F));
            tableLayoutPanel1.Controls.Add(button1, 2, 0);
            tableLayoutPanel1.Controls.Add(listBoxTransactions, 1, 1);
            tableLayoutPanel1.Controls.Add(button2, 3, 0);
            tableLayoutPanel1.Controls.Add(panel2, 0, 1);
            tableLayoutPanel1.Dock = DockStyle.Fill;
            tableLayoutPanel1.Location = new Point(0, 0);
            tableLayoutPanel1.Margin = new Padding(6);
            tableLayoutPanel1.Name = "tableLayoutPanel1";
            tableLayoutPanel1.RowCount = 2;
            tableLayoutPanel1.RowStyles.Add(new RowStyle(SizeType.Percent, 6.888889F));
            tableLayoutPanel1.RowStyles.Add(new RowStyle(SizeType.Percent, 93.1111145F));
            tableLayoutPanel1.Size = new Size(1600, 960);
            tableLayoutPanel1.TabIndex = 0;
            // 
            // button1
            // 
            button1.Dock = DockStyle.Fill;
            button1.Location = new Point(1065, 6);
            button1.Margin = new Padding(6);
            button1.Name = "button1";
            button1.Size = new Size(276, 54);
            button1.TabIndex = 0;
            button1.Text = "저장";
            button1.UseVisualStyleBackColor = true;
            button1.Click += button1_Click;
            // 
            // listBoxTransactions
            // 
            tableLayoutPanel1.SetColumnSpan(listBoxTransactions, 3);
            listBoxTransactions.Dock = DockStyle.Fill;
            listBoxTransactions.FormattingEnabled = true;
            listBoxTransactions.Location = new Point(607, 72);
            listBoxTransactions.Margin = new Padding(6);
            listBoxTransactions.Name = "listBoxTransactions";
            listBoxTransactions.Size = new Size(987, 882);
            listBoxTransactions.TabIndex = 1;
            // 
            // button2
            // 
            button2.Dock = DockStyle.Fill;
            button2.Location = new Point(1353, 6);
            button2.Margin = new Padding(6);
            button2.Name = "button2";
            button2.Size = new Size(241, 54);
            button2.TabIndex = 2;
            button2.Text = "조회";
            button2.UseVisualStyleBackColor = true;
            button2.Click += button2_Click;
            // 
            // panel2
            // 
            panel2.Controls.Add(tableLayoutPanel2);
            panel2.Dock = DockStyle.Fill;
            panel2.Location = new Point(6, 72);
            panel2.Margin = new Padding(6);
            panel2.Name = "panel2";
            panel2.Size = new Size(589, 882);
            panel2.TabIndex = 4;
            // 
            // tableLayoutPanel2
            // 
            tableLayoutPanel2.ColumnCount = 3;
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 29.2876F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 70.7124F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 20F));
            tableLayoutPanel2.Controls.Add(label1, 0, 0);
            tableLayoutPanel2.Controls.Add(txtContent, 0, 7);
            tableLayoutPanel2.Controls.Add(label7, 0, 6);
            tableLayoutPanel2.Controls.Add(label4, 0, 1);
            tableLayoutPanel2.Controls.Add(txtPayType, 1, 3);
            tableLayoutPanel2.Controls.Add(txtCost, 1, 5);
            tableLayoutPanel2.Controls.Add(label3, 0, 4);
            tableLayoutPanel2.Controls.Add(label2, 0, 5);
            tableLayoutPanel2.Controls.Add(label6, 0, 3);
            tableLayoutPanel2.Controls.Add(txtCategory, 1, 4);
            tableLayoutPanel2.Controls.Add(dtpDate, 0, 2);
            tableLayoutPanel2.Controls.Add(lbNo, 0, 8);
            tableLayoutPanel2.Controls.Add(cmbType, 1, 0);
            tableLayoutPanel2.Dock = DockStyle.Fill;
            tableLayoutPanel2.Location = new Point(0, 0);
            tableLayoutPanel2.Name = "tableLayoutPanel2";
            tableLayoutPanel2.RowCount = 9;
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Absolute, 50F));
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Absolute, 50F));
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Absolute, 50F));
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Absolute, 50F));
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Absolute, 50F));
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Absolute, 50F));
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Absolute, 50F));
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Absolute, 50F));
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Percent, 100F));
            tableLayoutPanel2.Size = new Size(589, 882);
            tableLayoutPanel2.TabIndex = 11;
            // 
            // label1
            // 
            label1.AutoSize = true;
            label1.Dock = DockStyle.Fill;
            label1.Location = new Point(6, 0);
            label1.Margin = new Padding(6, 0, 6, 0);
            label1.Name = "label1";
            label1.Size = new Size(154, 50);
            label1.TabIndex = 4;
            label1.Text = "종류";
            // 
            // txtContent
            // 
            tableLayoutPanel2.SetColumnSpan(txtContent, 3);
            txtContent.Dock = DockStyle.Fill;
            txtContent.Location = new Point(6, 356);
            txtContent.Margin = new Padding(6);
            txtContent.Name = "txtContent";
            txtContent.Size = new Size(577, 39);
            txtContent.TabIndex = 9;
            // 
            // label7
            // 
            label7.AutoSize = true;
            label7.Dock = DockStyle.Fill;
            label7.Location = new Point(6, 300);
            label7.Margin = new Padding(6, 0, 6, 0);
            label7.Name = "label7";
            label7.Size = new Size(154, 50);
            label7.TabIndex = 10;
            label7.Text = "내용";
            // 
            // label4
            // 
            label4.AutoSize = true;
            label4.Dock = DockStyle.Fill;
            label4.Location = new Point(6, 50);
            label4.Margin = new Padding(6, 0, 6, 0);
            label4.Name = "label4";
            label4.Size = new Size(154, 50);
            label4.TabIndex = 4;
            label4.Text = "Date";
            // 
            // txtPayType
            // 
            txtPayType.Dock = DockStyle.Fill;
            txtPayType.Location = new Point(172, 156);
            txtPayType.Margin = new Padding(6);
            txtPayType.Name = "txtPayType";
            txtPayType.Size = new Size(390, 39);
            txtPayType.TabIndex = 7;
            // 
            // txtCost
            // 
            txtCost.Dock = DockStyle.Fill;
            txtCost.Location = new Point(172, 256);
            txtCost.Margin = new Padding(6);
            txtCost.Name = "txtCost";
            txtCost.Size = new Size(390, 39);
            txtCost.TabIndex = 3;
            // 
            // label3
            // 
            label3.AutoSize = true;
            label3.Dock = DockStyle.Fill;
            label3.Location = new Point(6, 200);
            label3.Margin = new Padding(6, 0, 6, 0);
            label3.Name = "label3";
            label3.Size = new Size(154, 50);
            label3.TabIndex = 4;
            label3.Text = "분류";
            // 
            // label2
            // 
            label2.AutoSize = true;
            label2.Dock = DockStyle.Fill;
            label2.Location = new Point(6, 250);
            label2.Margin = new Padding(6, 0, 6, 0);
            label2.Name = "label2";
            label2.Size = new Size(154, 50);
            label2.TabIndex = 4;
            label2.Text = "금액";
            // 
            // label6
            // 
            label6.AutoSize = true;
            label6.Dock = DockStyle.Fill;
            label6.Location = new Point(6, 150);
            label6.Margin = new Padding(6, 0, 6, 0);
            label6.Name = "label6";
            label6.Size = new Size(154, 50);
            label6.TabIndex = 8;
            label6.Text = "카드＆현금";
            // 
            // txtCategory
            // 
            txtCategory.Dock = DockStyle.Fill;
            txtCategory.Location = new Point(172, 206);
            txtCategory.Margin = new Padding(6);
            txtCategory.Name = "txtCategory";
            txtCategory.Size = new Size(390, 39);
            txtCategory.TabIndex = 3;
            // 
            // dtpDate
            // 
            tableLayoutPanel2.SetColumnSpan(dtpDate, 3);
            dtpDate.Dock = DockStyle.Fill;
            dtpDate.Location = new Point(6, 106);
            dtpDate.Margin = new Padding(6);
            dtpDate.Name = "dtpDate";
            dtpDate.Size = new Size(577, 39);
            dtpDate.TabIndex = 5;
            // 
            // lbNo
            // 
            lbNo.AutoSize = true;
            lbNo.Location = new Point(3, 400);
            lbNo.Name = "lbNo";
            lbNo.Size = new Size(27, 32);
            lbNo.TabIndex = 5;
            lbNo.Text = "0";
            // 
            // cmbType
            // 
            cmbType.FormattingEnabled = true;
            cmbType.Items.AddRange(new object[] { "지출", "수입" });
            cmbType.Location = new Point(169, 3);
            cmbType.Name = "cmbType";
            cmbType.Size = new Size(242, 40);
            cmbType.TabIndex = 11;
            // 
            // Form1
            // 
            AutoScaleDimensions = new SizeF(14F, 32F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(1600, 960);
            Controls.Add(panel1);
            Margin = new Padding(6);
            Name = "Form1";
            Text = "Form1";
            panel1.ResumeLayout(false);
            tableLayoutPanel1.ResumeLayout(false);
            panel2.ResumeLayout(false);
            tableLayoutPanel2.ResumeLayout(false);
            tableLayoutPanel2.PerformLayout();
            ResumeLayout(false);
        }

        #endregion

        private Panel panel1;
        private TableLayoutPanel tableLayoutPanel1;
        private Button button1;
        private ListBox listBoxTransactions;
        private Button button2;
        private Panel panel2;
        private TextBox txtDescription;
        private TextBox txtCost;
        private TextBox txtCategory;
        private Label label1;
        private Label label2;
        private Label label3;
        private DateTimePicker dtpDate;
        private Label label4;
        private ComboBox comboBox1;
        private Label lbNo;
        private TextBox txtContent;
        private Label label7;
        private Label label6;
        private TextBox txtPayType;
        private TableLayoutPanel tableLayoutPanel2;
        private ComboBox cmbType;
    }
}
