import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = path.join(root, "release");
const files = (await readdir(releaseDir)).filter((file) => file.toLowerCase().endsWith(".exe"));
if (!files.length) throw new Error("release目录中没有找到Windows安装程序");

const checksumLines = [];
for (const fileName of files) {
  const content = await readFile(path.join(releaseDir, fileName));
  const hash = createHash("sha256").update(content).digest("hex");
  checksumLines.push(`${hash}  ${fileName}`);
}
await writeFile(path.join(releaseDir, "SHA256SUMS.txt"), `${checksumLines.join("\r\n")}\r\n`, "utf8");

const instructions = `C1 手动挡科目一通关助手 - 安装说明\r\n\r\n1. 双击 C1-Kemuyi-Setup-*.exe。\r\n2. 如果 Windows SmartScreen 显示“Windows 已保护你的电脑”，点击“更多信息”，再点击“仍要运行”。\r\n3. 按安装向导选择目录并完成安装。\r\n4. 安装后可从桌面或开始菜单打开，无需联网。\r\n\r\n说明：此安装包未购买商业代码签名证书，因此会显示“未知发布者”。学习档案和成绩只保存在当前电脑。\r\n`;
await writeFile(path.join(releaseDir, "安装说明.txt"), instructions, "utf8");
console.log("发布说明与SHA-256校验文件已生成。");
