REM --------------------------------------------------------------------
REM This generates an encrypted password from a plain text string
REM invoke it like:  "cmd /c hash mypassword"
REM --------------------------------------------------------------------
 
 node -e "import('bcrypt').then(b=>b.hash(process.argv[1],10).then(h=>console.log(h)))" %1