import docx
import sys

# Set UTF-8 encoding for output
sys.stdout.reconfigure(encoding='utf-8')

doc = docx.Document('Clínica del PC.docx')
for paragraph in doc.paragraphs:
    print(paragraph.text)
