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
            txtDescription = new TextBox();
            txtAmount = new TextBox();
            txtCategory = new TextBox();
            label1 = new Label();
            label2 = new Label();
            label3 = new Label();
            dtpDate = new DateTimePicker();
            label4 = new Label();
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
            panel1.Name = "panel1";
            panel1.Size = new Size(800, 450);
            panel1.TabIndex = 0;
            // 
            // tableLayoutPanel1
            // 
            tableLayoutPanel1.ColumnCount = 4;
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 56.7107735F));
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 43.2892265F));
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 144F));
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 126F));
            tableLayoutPanel1.Controls.Add(button1, 2, 0);
            tableLayoutPanel1.Controls.Add(listBoxTransactions, 1, 1);
            tableLayoutPanel1.Controls.Add(button2, 3, 0);
            tableLayoutPanel1.Controls.Add(panel2, 0, 1);
            tableLayoutPanel1.Dock = DockStyle.Fill;
            tableLayoutPanel1.Location = new Point(0, 0);
            tableLayoutPanel1.Name = "tableLayoutPanel1";
            tableLayoutPanel1.RowCount = 2;
            tableLayoutPanel1.RowStyles.Add(new RowStyle(SizeType.Percent, 6.888889F));
            tableLayoutPanel1.RowStyles.Add(new RowStyle(SizeType.Percent, 93.1111145F));
            tableLayoutPanel1.Size = new Size(800, 450);
            tableLayoutPanel1.TabIndex = 0;
            // 
            // button1
            // 
            button1.Dock = DockStyle.Fill;
            button1.Location = new Point(532, 3);
            button1.Name = "button1";
            button1.Size = new Size(138, 25);
            button1.TabIndex = 0;
            button1.Text = "Add Transaction";
            button1.UseVisualStyleBackColor = true;
            button1.Click += button1_Click;
            // 
            // listBoxTransactions
            // 
            tableLayoutPanel1.SetColumnSpan(listBoxTransactions, 3);
            listBoxTransactions.Dock = DockStyle.Fill;
            listBoxTransactions.FormattingEnabled = true;
            listBoxTransactions.ItemHeight = 15;
            listBoxTransactions.Location = new Point(303, 34);
            listBoxTransactions.Name = "listBoxTransactions";
            listBoxTransactions.Size = new Size(494, 413);
            listBoxTransactions.TabIndex = 1;
            // 
            // button2
            // 
            button2.Dock = DockStyle.Fill;
            button2.Location = new Point(676, 3);
            button2.Name = "button2";
            button2.Size = new Size(121, 25);
            button2.TabIndex = 2;
            button2.Text = "ListTrasns";
            button2.UseVisualStyleBackColor = true;
            button2.Click += button2_Click;
            // 
            // panel2
            // 
            panel2.Controls.Add(tableLayoutPanel2);
            panel2.Location = new Point(3, 34);
            panel2.Name = "panel2";
            panel2.Size = new Size(200, 404);
            panel2.TabIndex = 4;
            // 
            // tableLayoutPanel2
            // 
            tableLayoutPanel2.ColumnCount = 2;
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 53F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 47F));
            tableLayoutPanel2.Controls.Add(txtDescription, 1, 0);
            tableLayoutPanel2.Controls.Add(txtAmount, 1, 1);
            tableLayoutPanel2.Controls.Add(txtCategory, 1, 2);
            tableLayoutPanel2.Controls.Add(label1, 0, 0);
            tableLayoutPanel2.Controls.Add(label2, 0, 1);
            tableLayoutPanel2.Controls.Add(label3, 0, 2);
            tableLayoutPanel2.Controls.Add(dtpDate, 1, 3);
            tableLayoutPanel2.Controls.Add(label4, 0, 3);
            tableLayoutPanel2.Dock = DockStyle.Fill;
            tableLayoutPanel2.Location = new Point(0, 0);
            tableLayoutPanel2.Name = "tableLayoutPanel2";
            tableLayoutPanel2.RowCount = 5;
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Percent, 11.3725491F));
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Percent, 11.3725491F));
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Percent, 11.7647057F));
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Percent, 11.7647057F));
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Percent, 53.72549F));
            tableLayoutPanel2.Size = new Size(200, 404);
            tableLayoutPanel2.TabIndex = 0;
            // 
            // txtDescription
            // 
            txtDescription.Dock = DockStyle.Fill;
            txtDescription.Location = new Point(109, 3);
            txtDescription.Name = "txtDescription";
            txtDescription.Size = new Size(88, 23);
            txtDescription.TabIndex = 3;
            // 
            // txtAmount
            // 
            txtAmount.Dock = DockStyle.Fill;
            txtAmount.Location = new Point(109, 48);
            txtAmount.Name = "txtAmount";
            txtAmount.Size = new Size(88, 23);
            txtAmount.TabIndex = 3;
            // 
            // txtCategory
            // 
            txtCategory.Dock = DockStyle.Fill;
            txtCategory.Location = new Point(109, 93);
            txtCategory.Name = "txtCategory";
            txtCategory.Size = new Size(88, 23);
            txtCategory.TabIndex = 3;
            // 
            // label1
            // 
            label1.AutoSize = true;
            label1.Dock = DockStyle.Fill;
            label1.Location = new Point(3, 0);
            label1.Name = "label1";
            label1.Size = new Size(100, 45);
            label1.TabIndex = 4;
            label1.Text = "Description";
            // 
            // label2
            // 
            label2.AutoSize = true;
            label2.Dock = DockStyle.Fill;
            label2.Location = new Point(3, 45);
            label2.Name = "label2";
            label2.Size = new Size(100, 45);
            label2.TabIndex = 4;
            label2.Text = "Amount";
            // 
            // label3
            // 
            label3.AutoSize = true;
            label3.Dock = DockStyle.Fill;
            label3.Location = new Point(3, 90);
            label3.Name = "label3";
            label3.Size = new Size(100, 47);
            label3.TabIndex = 4;
            label3.Text = "Category";
            // 
            // dtpDate
            // 
            dtpDate.Dock = DockStyle.Fill;
            dtpDate.Location = new Point(109, 140);
            dtpDate.Name = "dtpDate";
            dtpDate.Size = new Size(88, 23);
            dtpDate.TabIndex = 5;
            // 
            // label4
            // 
            label4.AutoSize = true;
            label4.Dock = DockStyle.Fill;
            label4.Location = new Point(3, 137);
            label4.Name = "label4";
            label4.Size = new Size(100, 47);
            label4.TabIndex = 4;
            label4.Text = "Date";
            // 
            // Form1
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(800, 450);
            Controls.Add(panel1);
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
        private TableLayoutPanel tableLayoutPanel2;
        private TextBox txtDescription;
        private TextBox txtAmount;
        private TextBox txtCategory;
        private Label label1;
        private Label label2;
        private Label label3;
        private DateTimePicker dtpDate;
        private Label label4;
    }
}
