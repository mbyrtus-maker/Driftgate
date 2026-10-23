import asyncio,sys
from playwright.async_api import async_playwright
import os,tempfile
# the game under test: index.html at the repo root, or a file named in DG_GAME; screenshots go to DG_OUT (default: temp dir)
GAME='file://'+os.path.abspath(os.environ.get('DG_GAME',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','index.html')))
D=os.path.join(os.environ.get('DG_OUT',tempfile.gettempdir()),'')
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=await b.new_page();err=[];pg.on('pageerror',lambda e:err.append(str(e)));pg.on('console',lambda m:err.append('console:'+m.text) if m.type=='error' else None)
    await pg.goto(GAME+'?name=Tester');await pg.wait_for_timeout(8000)
    print(await pg.evaluate("typeof __dg"),err[:5]);await b.close()
asyncio.run(main())
