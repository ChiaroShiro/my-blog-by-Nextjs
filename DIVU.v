module DIVU(
    input        [31:0] dividend,   // 被除数
    input        [31:0] divisor,    // 除数
    input                start,     // 启动信号，高电平有效
    input                clock,     
    input                reset,     
    output reg   [31:0] q,         // 商
    output reg   [31:0] r,         // 余数
    output reg           busy       // 除法器忙信号
);

  // 内部寄存器：64位寄存器存储【余数, 被除数】，计数器
  reg [63:0] temp;
  reg [63:0] new_temp;  // 将局部变量移至模块级别
  reg [5:0]  count;  // 需要计数 0~32（共33个状态，但循环 32 次）

  // 复位或迭代过程
  always @(posedge clock or posedge reset) begin
    if(reset) begin
      busy   <= 1'b0;
      count  <= 6'd0;
      temp   <= 64'd0;
      q      <= 32'd0;
      r      <= 32'd0;
    end
    else begin
      // 检查启动信号：当 start 有效且当前空闲时，装入初值
      if(start && !busy) begin
        busy   <= 1'b1;
        count  <= 6'd0;
        // 初始设置：高 32 位余数置 0，低 32 位为被除数
        temp   <= {32'd0, dividend};
      end 
      else if(busy) begin
        // 每个时钟周期进行一次移位减法操作
        // 1. 左移一位
        // 2. 判断移位后高 32 位是否大于等于除数
        // 3. 若满足条件则：减去除数并把最低位补 1
        new_temp = temp << 1;
        if(new_temp[63:32] >= divisor) begin
          new_temp[63:32] = new_temp[63:32] - divisor;
          new_temp[0]    = 1'b1;  // 补 1 表示这一位为商 1
        end
        temp  <= new_temp;
        count <= count + 6'd1;
        // 当达到 32 次时停止迭代，结果写入输出
        if(count == 6'd31) begin
          busy <= 1'b0;
          q    <= new_temp[31:0];    // 商存低 32 位
          r    <= new_temp[63:32];   // 余数存高 32 位
        end
      end // busy
    end // else not reset
  end

endmodule 