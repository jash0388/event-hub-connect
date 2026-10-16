var e=new TextEncoder,t=.75;function n(e){let t=``;for(let n=0;n<e.length;n++)t+=e.charCodeAt(n).toString(16).padStart(4,`0`);return t.toUpperCase()}function r(e,r){let i=[`BT`,`3 Tr`];for(let a of e){let e=a.text.replace(/[\u0000-\u001f￼­]/g,` `);if(!e.trim())continue;let o=Math.max(1,a.fontSize||12),s=Math.max(1,a.width*t),c=Math.max(1,Math.min(1e4,s/(e.length*o*.5)*100));i.push(`/F1 ${o.toFixed(2)} Tf ${c.toFixed(2)} Tz 1 0 0 1 ${(a.x*t).toFixed(2)} ${((r-a.baseline)*t).toFixed(2)} Tm <${n(e)}> Tj`)}return i.push(`ET`),i.join(`
`)}var i=`/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /Adobe-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
1 beginbfrange
<0000> <FFFF> <0000>
endbfrange
endcmap
CMapName currentdict /CMap defineresource pop
end
end`;function a(n,{title:a=`Document`,author:o=``}={}){let s=[],c=[],l=0,u=t=>{let n=typeof t==`string`?e.encode(t):t;s.push(n),l+=n.length},d=[],f=()=>(d.push(null),d.length),p=(e,t)=>{d[e-1]=t},m=e=>`(${String(e).replace(/[\\()]/g,e=>`\\`+e).replace(/[^\x20-\x7e]/g,`?`)})`,h=f(),g=f(),_=f(),v=f(),y=f(),b=f(),x=f();p(x,`<< /Title ${m(a)} /Author ${m(o)} /Producer (Documents) /Creator (Documents) >>`),p(b,{stream:e.encode(i)}),p(y,`<< /Type /FontDescriptor /FontName /DocumentsTextLayer /Flags 4 /FontBBox [0 -200 1000 800] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 700 /StemV 80 >>`),p(v,`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /DocumentsTextLayer /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${y} 0 R /DW 500 /CIDToGIDMap /Identity >>`),p(_,`<< /Type /Font /Subtype /Type0 /BaseFont /DocumentsTextLayer /Encoding /Identity-H /DescendantFonts [${v} 0 R] /ToUnicode ${b} 0 R >>`);let S=[];for(let i of n){let n=f(),a=f(),o=f();S.push(n);let s=i.widthPx*t,c=i.heightPx*t;p(a,{dict:`/Type /XObject /Subtype /Image /Width ${i.imageWidth} /Height ${i.imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,stream:i.jpeg}),p(o,{stream:e.encode(`q ${s.toFixed(2)} 0 0 ${c.toFixed(2)} 0 0 cm /Im1 Do Q\n${r(i.fragments,i.heightPx)}`)}),p(n,`<< /Type /Page /Parent ${g} 0 R /MediaBox [0 0 ${s.toFixed(2)} ${c.toFixed(2)}] /Resources << /XObject << /Im1 ${a} 0 R >> /Font << /F1 ${_} 0 R >> >> /Contents ${o} 0 R >>`)}p(g,`<< /Type /Pages /Kids [${S.map(e=>`${e} 0 R`).join(` `)}] /Count ${S.length} >>`),p(h,`<< /Type /Catalog /Pages ${g} 0 R >>`),u(new Uint8Array([...e.encode(`%PDF-1.7
%`),226,227,207,211,10]));for(let e=0;e<d.length;e++){c[e]=l;let t=d[e];typeof t==`string`?u(`${e+1} 0 obj\n${t}\nendobj\n`):(u(`${e+1} 0 obj\n<< ${t.dict?t.dict+` `:``}/Length ${t.stream.length} >>\nstream\n`),u(t.stream),u(`
endstream
endobj
`))}let C=l;u(`xref\n0 ${d.length+1}\n0000000000 65535 f \n${c.map(e=>`${String(e).padStart(10,`0`)} 00000 n \n`).join(``)}`),u(`trailer\n<< /Size ${d.length+1} /Root ${h} 0 R /Info ${x} 0 R >>\nstartxref\n${C}\n%%EOF\n`);let w=new Uint8Array(l),T=0;for(let e of s)w.set(e,T),T+=e.length;return w}function o(e,t){let n=[];for(let r of e)if(!(r.page!==t||r.virtual||r.cellText))for(let e of r.fragments||[])e.text&&!e.image&&n.push({text:e.text,x:e.x,baseline:r.baseline,width:e.width,fontSize:e.fontSize});return n}var s=e=>new Promise((t,n)=>e.toBlob(e=>e?e.arrayBuffer().then(e=>t(new Uint8Array(e)),n):n(Error(`The page could not be encoded.`)),`image/jpeg`,.92));async function c(e,{title:t}={}){await e.fontRefresh;let n=e.printSheets(),{layout:r,storyLayout:i}=e.printedLayout||e,c=[...r.lines,...r.repeatedLines||[],...i?.lines||[]],l=[];for(let[e,t]of n.entries()){let n=r.pages[e]||r.page;l.push({widthPx:n.width,heightPx:n.height,jpeg:await s(t),imageWidth:t.width,imageHeight:t.height,fragments:o(c,e)})}return new Blob([a(l,{title:t})],{type:`application/pdf`})}export{c as exportPdf};