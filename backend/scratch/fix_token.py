import os

file_path = r'c:\Users\renuk\Projects\cold Mail Sender\frontend\src\app\dashboard\campaigns\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "import React, { useState, useEffect, useCallback } from 'react';",
    "import React, { useState, useEffect, useCallback } from 'react';\nimport { supabase } from '@/lib/supabase';"
)

content = content.replace(
    "localStorage.getItem('access_token')",
    "(await supabase.auth.getSession()).data.session?.access_token"
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced successfully!")
