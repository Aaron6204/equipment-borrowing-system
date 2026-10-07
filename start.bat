   @echo off
   set PROJECT=C:\Users\Aeron\Documents\equipment-borrowing-system
   start "SEBS Backend" cmd /k "cd /d %PROJECT%\backend && npm run dev"
   start "SEBS Frontend" cmd /k "cd /d %PROJECT%\frontend && npm run dev"
   timeout /t 8 >nul
   start http://localhost:5173