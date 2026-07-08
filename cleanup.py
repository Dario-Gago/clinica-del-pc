import os
import shutil

files_to_remove = [
    'src/App.jsx',
    'src/index.css',
    'public/favicon.svg',
    'public/icons.svg',
    'README.md',
    'eslint.config.js'
]

dirs_to_remove = [
    'src/assets'
]

for file in files_to_remove:
    if os.path.exists(file):
        os.remove(file)
        print(f'Removed: {file}')

for dir in dirs_to_remove:
    if os.path.exists(dir):
        shutil.rmtree(dir)
        print(f'Removed directory: {dir}')

print('Cleanup complete')
