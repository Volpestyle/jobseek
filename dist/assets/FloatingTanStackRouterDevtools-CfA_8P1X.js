import{c as ce,a as Ie,b as F,u as xt,S as mt,d as Y,t as I,i as u,m as Z,e as D,f as d,g as Q,s,h as Ze,j as Ge,k as St,l as wt,n as Qe,o as _t,r as Je,p as gt,q as Ft,v as zt,w as Mt,x as Ut,D as Bt,y as Dt}from"./index-DEkvAkpa.js";const Ot=typeof window>"u";function Ye(e){const t={pending:"yellow",success:"green",error:"red",notFound:"purple",redirected:"gray"};return e.isFetching&&e.status==="success"?e.isFetching==="beforeLoad"?"purple":"blue":t[e.status]}function Et(e,t){const n=e.find(i=>i.routeId===t.id);return n?Ye(n):"gray"}function Tt(){const[e,t]=ce(!1);return(Ot?Ie:F)(()=>{t(!0)}),e}const It=e=>{const t=Object.getOwnPropertyNames(Object(e)),n=typeof e=="bigint"?`${e.toString()}n`:e;try{return JSON.stringify(n,t)}catch{return"unable to stringify"}};function Gt(e,t=[n=>n]){return e.map((n,i)=>[n,i]).sort(([n,i],[p,l])=>{for(const a of t){const c=a(n),g=a(p);if(typeof c>"u"){if(typeof g>"u")continue;return 1}if(c!==g)return c>g?1:-1}return i-l}).map(([n])=>n)}let Pt={data:""},At=e=>typeof window=="object"?((e?e.querySelector("#_goober"):window._goober)||Object.assign((e||document.head).appendChild(document.createElement("style")),{innerHTML:" ",id:"_goober"})).firstChild:e||Pt,Rt=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,Lt=/\/\*[^]*?\*\/|  +/g,pt=/\n+/g,Ce=(e,t)=>{let n="",i="",p="";for(let l in e){let a=e[l];l[0]=="@"?l[1]=="i"?n=l+" "+a+";":i+=l[1]=="f"?Ce(a,l):l+"{"+Ce(a,l[1]=="k"?"":t)+"}":typeof a=="object"?i+=Ce(a,t?t.replace(/([^,])+/g,c=>l.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,g=>/&/.test(g)?g.replace(/&/g,c):c?c+" "+g:g)):l):a!=null&&(l=/^--/.test(l)?l:l.replace(/[A-Z]/g,"-$&").toLowerCase(),p+=Ce.p?Ce.p(l,a):l+":"+a+";")}return n+(t&&p?t+"{"+p+"}":p)+i},ve={},bt=e=>{if(typeof e=="object"){let t="";for(let n in e)t+=n+bt(e[n]);return t}return e},jt=(e,t,n,i,p)=>{let l=bt(e),a=ve[l]||(ve[l]=(g=>{let o=0,r=11;for(;o<g.length;)r=101*r+g.charCodeAt(o++)>>>0;return"go"+r})(l));if(!ve[a]){let g=l!==e?e:(o=>{let r,$,h=[{}];for(;r=Rt.exec(o.replace(Lt,""));)r[4]?h.shift():r[3]?($=r[3].replace(pt," ").trim(),h.unshift(h[0][$]=h[0][$]||{})):h[0][r[1]]=r[2].replace(pt," ").trim();return h[0]})(e);ve[a]=Ce(p?{["@keyframes "+a]:g}:g,n?"":"."+a)}let c=n&&ve.g?ve.g:null;return n&&(ve.g=ve[a]),((g,o,r,$)=>{$?o.data=o.data.replace($,g):o.data.indexOf(g)===-1&&(o.data=r?g+o.data:o.data+g)})(ve[a],t,i,c),a},Ht=(e,t,n)=>e.reduce((i,p,l)=>{let a=t[l];if(a&&a.call){let c=a(n),g=c&&c.props&&c.props.className||/^go/.test(c)&&c;a=g?"."+g:c&&typeof c=="object"?c.props?"":Ce(c,""):c===!1?"":c}return i+p+(a??"")},"");function ze(e){let t=this||{},n=e.call?e(t.p):e;return jt(n.unshift?n.raw?Ht(n,[].slice.call(arguments,1),t.p):n.reduce((i,p)=>Object.assign(i,p&&p.call?p(t.p):p),{}):n,At(t.target),t.g,t.o,t.k)}ze.bind({g:1});ze.bind({k:1});const T={colors:{inherit:"inherit",current:"currentColor",transparent:"transparent",black:"#000000",white:"#ffffff",neutral:{50:"#f9fafb",100:"#f2f4f7",200:"#eaecf0",300:"#d0d5dd",400:"#98a2b3",500:"#667085",600:"#475467",700:"#344054",800:"#1d2939",900:"#101828"},darkGray:{50:"#525c7a",100:"#49536e",200:"#414962",300:"#394056",400:"#313749",500:"#292e3d",600:"#212530",700:"#191c24",800:"#111318",900:"#0b0d10"},gray:{50:"#f9fafb",100:"#f2f4f7",200:"#eaecf0",300:"#d0d5dd",400:"#98a2b3",500:"#667085",600:"#475467",700:"#344054",800:"#1d2939",900:"#101828"},blue:{25:"#F5FAFF",50:"#EFF8FF",100:"#D1E9FF",200:"#B2DDFF",300:"#84CAFF",400:"#53B1FD",500:"#2E90FA",600:"#1570EF",700:"#175CD3",800:"#1849A9",900:"#194185"},green:{25:"#F6FEF9",50:"#ECFDF3",100:"#D1FADF",200:"#A6F4C5",300:"#6CE9A6",400:"#32D583",500:"#12B76A",600:"#039855",700:"#027A48",800:"#05603A",900:"#054F31"},red:{50:"#fef2f2",100:"#fee2e2",200:"#fecaca",300:"#fca5a5",400:"#f87171",500:"#ef4444",600:"#dc2626",700:"#b91c1c",800:"#991b1b",900:"#7f1d1d",950:"#450a0a"},yellow:{25:"#FFFCF5",50:"#FFFAEB",100:"#FEF0C7",200:"#FEDF89",300:"#FEC84B",400:"#FDB022",500:"#F79009",600:"#DC6803",700:"#B54708",800:"#93370D",900:"#7A2E0E"},purple:{25:"#FAFAFF",50:"#F4F3FF",100:"#EBE9FE",200:"#D9D6FE",300:"#BDB4FE",400:"#9B8AFB",500:"#7A5AF8",600:"#6938EF",700:"#5925DC",800:"#4A1FB8",900:"#3E1C96"},teal:{25:"#F6FEFC",50:"#F0FDF9",100:"#CCFBEF",200:"#99F6E0",300:"#5FE9D0",400:"#2ED3B7",500:"#15B79E",600:"#0E9384",700:"#107569",800:"#125D56",900:"#134E48"},pink:{25:"#fdf2f8",50:"#fce7f3",100:"#fbcfe8",200:"#f9a8d4",300:"#f472b6",400:"#ec4899",500:"#db2777",600:"#be185d",700:"#9d174d",800:"#831843",900:"#500724"},cyan:{25:"#ecfeff",50:"#cffafe",100:"#a5f3fc",200:"#67e8f9",300:"#22d3ee",400:"#06b6d4",500:"#0891b2",600:"#0e7490",700:"#155e75",800:"#164e63",900:"#083344"}},alpha:{90:"e5",70:"b3",20:"33"},font:{size:{"2xs":"calc(var(--tsrd-font-size) * 0.625)",xs:"calc(var(--tsrd-font-size) * 0.75)",sm:"calc(var(--tsrd-font-size) * 0.875)",md:"var(--tsrd-font-size)"},lineHeight:{xs:"calc(var(--tsrd-font-size) * 1)",sm:"calc(var(--tsrd-font-size) * 1.25)"},weight:{normal:"400",medium:"500",semibold:"600",bold:"700"},fontFamily:{sans:"ui-sans-serif, Inter, system-ui, sans-serif, sans-serif",mono:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"}},border:{radius:{xs:"calc(var(--tsrd-font-size) * 0.125)",sm:"calc(var(--tsrd-font-size) * 0.25)",md:"calc(var(--tsrd-font-size) * 0.375)",full:"9999px"}},size:{0:"0px",.5:"calc(var(--tsrd-font-size) * 0.125)",1:"calc(var(--tsrd-font-size) * 0.25)",1.5:"calc(var(--tsrd-font-size) * 0.375)",2:"calc(var(--tsrd-font-size) * 0.5)",2.5:"calc(var(--tsrd-font-size) * 0.625)",3:"calc(var(--tsrd-font-size) * 0.75)",3.5:"calc(var(--tsrd-font-size) * 0.875)",4:"calc(var(--tsrd-font-size) * 1)",5:"calc(var(--tsrd-font-size) * 1.25)",8:"calc(var(--tsrd-font-size) * 2)"}},Nt=e=>{const{colors:t,font:n,size:i,alpha:p,border:l}=T,{fontFamily:a,lineHeight:c,size:g}=n,o=e?ze.bind({target:e}):ze;return{devtoolsPanelContainer:o`
      direction: ltr;
      position: fixed;
      bottom: 0;
      right: 0;
      z-index: 99999;
      width: 100%;
      max-height: 90%;
      border-top: 1px solid ${t.gray[700]};
      transform-origin: top;
    `,devtoolsPanelContainerVisibility:r=>o`
        visibility: ${r?"visible":"hidden"};
      `,devtoolsPanelContainerResizing:r=>r()?o`
          transition: none;
        `:o`
        transition: all 0.4s ease;
      `,devtoolsPanelContainerAnimation:(r,$)=>r?o`
          pointer-events: auto;
          transform: translateY(0);
        `:o`
        pointer-events: none;
        transform: translateY(${$}px);
      `,logo:o`
      cursor: pointer;
      display: flex;
      flex-direction: column;
      background-color: transparent;
      border: none;
      font-family: ${a.sans};
      gap: ${T.size[.5]};
      padding: 0px;
      &:hover {
        opacity: 0.7;
      }
      &:focus-visible {
        outline-offset: 4px;
        border-radius: ${l.radius.xs};
        outline: 2px solid ${t.blue[800]};
      }
    `,tanstackLogo:o`
      font-size: ${n.size.md};
      font-weight: ${n.weight.bold};
      line-height: ${n.lineHeight.xs};
      white-space: nowrap;
      color: ${t.gray[300]};
    `,routerLogo:o`
      font-weight: ${n.weight.semibold};
      font-size: ${n.size.xs};
      background: linear-gradient(to right, #84cc16, #10b981);
      background-clip: text;
      -webkit-background-clip: text;
      line-height: 1;
      -webkit-text-fill-color: transparent;
      white-space: nowrap;
    `,devtoolsPanel:o`
      display: flex;
      font-size: ${g.sm};
      font-family: ${a.sans};
      background-color: ${t.darkGray[700]};
      color: ${t.gray[300]};

      @media (max-width: 700px) {
        flex-direction: column;
      }
      @media (max-width: 600px) {
        font-size: ${g.xs};
      }
    `,dragHandle:o`
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 4px;
      cursor: row-resize;
      z-index: 100000;
      &:hover {
        background-color: ${t.purple[400]}${p[90]};
      }
    `,firstContainer:o`
      flex: 1 1 500px;
      min-height: 40%;
      max-height: 100%;
      overflow: auto;
      border-right: 1px solid ${t.gray[700]};
      display: flex;
      flex-direction: column;
    `,routerExplorerContainer:o`
      overflow-y: auto;
      flex: 1;
    `,routerExplorer:o`
      padding: ${T.size[2]};
    `,row:o`
      display: flex;
      align-items: center;
      padding: ${T.size[2]} ${T.size[2.5]};
      gap: ${T.size[2.5]};
      border-bottom: ${t.darkGray[500]} 1px solid;
      align-items: center;
    `,detailsHeader:o`
      font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      position: sticky;
      top: 0;
      z-index: 2;
      background-color: ${t.darkGray[600]};
      padding: 0px ${T.size[2]};
      font-weight: ${n.weight.medium};
      font-size: ${n.size.xs};
      min-height: ${T.size[8]};
      line-height: ${n.lineHeight.xs};
      text-align: left;
      display: flex;
      align-items: center;
    `,maskedBadge:o`
      background: ${t.yellow[900]}${p[70]};
      color: ${t.yellow[300]};
      display: inline-block;
      padding: ${T.size[0]} ${T.size[2.5]};
      border-radius: ${l.radius.full};
      font-size: ${n.size.xs};
      font-weight: ${n.weight.normal};
      border: 1px solid ${t.yellow[300]};
    `,maskedLocation:o`
      color: ${t.yellow[300]};
    `,detailsContent:o`
      padding: ${T.size[1.5]} ${T.size[2]};
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: ${n.size.xs};
    `,routeMatchesToggle:o`
      display: flex;
      align-items: center;
      border: 1px solid ${t.gray[500]};
      border-radius: ${l.radius.sm};
      overflow: hidden;
    `,routeMatchesToggleBtn:(r,$)=>{const y=[o`
        appearance: none;
        border: none;
        font-size: 12px;
        padding: 4px 8px;
        background: transparent;
        cursor: pointer;
        font-family: ${a.sans};
        font-weight: ${n.weight.medium};
      `];if(r){const x=o`
          background: ${t.darkGray[400]};
          color: ${t.gray[300]};
        `;y.push(x)}else{const x=o`
          color: ${t.gray[500]};
          background: ${t.darkGray[800]}${p[20]};
        `;y.push(x)}return $&&y.push(o`
          border-right: 1px solid ${T.colors.gray[500]};
        `),y},detailsHeaderInfo:o`
      flex: 1;
      justify-content: flex-end;
      display: flex;
      align-items: center;
      font-weight: ${n.weight.normal};
      color: ${t.gray[400]};
    `,matchRow:r=>{const h=[o`
        display: flex;
        border-bottom: 1px solid ${t.darkGray[400]};
        cursor: pointer;
        align-items: center;
        padding: ${i[1]} ${i[2]};
        gap: ${i[2]};
        font-size: ${g.xs};
        color: ${t.gray[300]};
      `];if(r){const y=o`
          background: ${t.darkGray[500]};
        `;h.push(y)}return h},matchIndicator:r=>{const h=[o`
        flex: 0 0 auto;
        width: ${i[3]};
        height: ${i[3]};
        background: ${t[r][900]};
        border: 1px solid ${t[r][500]};
        border-radius: ${l.radius.full};
        transition: all 0.25s ease-out;
        box-sizing: border-box;
      `];if(r==="gray"){const y=o`
          background: ${t.gray[700]};
          border-color: ${t.gray[400]};
        `;h.push(y)}return h},matchID:o`
      flex: 1;
      line-height: ${c.xs};
    `,ageTicker:r=>{const h=[o`
        display: flex;
        gap: ${i[1]};
        font-size: ${g.xs};
        color: ${t.gray[400]};
        font-variant-numeric: tabular-nums;
        line-height: ${c.xs};
      `];if(r){const y=o`
          color: ${t.yellow[400]};
        `;h.push(y)}return h},secondContainer:o`
      flex: 1 1 500px;
      min-height: 40%;
      max-height: 100%;
      overflow: auto;
      border-right: 1px solid ${t.gray[700]};
      display: flex;
      flex-direction: column;
    `,thirdContainer:o`
      flex: 1 1 500px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      height: 100%;
      border-right: 1px solid ${t.gray[700]};

      @media (max-width: 700px) {
        border-top: 2px solid ${t.gray[700]};
      }
    `,fourthContainer:o`
      flex: 1 1 500px;
      min-height: 40%;
      max-height: 100%;
      overflow: auto;
      display: flex;
      flex-direction: column;
    `,routesContainer:o`
      overflow-x: auto;
      overflow-y: visible;
    `,routesRowContainer:(r,$)=>{const y=[o`
        display: flex;
        border-bottom: 1px solid ${t.darkGray[400]};
        align-items: center;
        padding: ${i[1]} ${i[2]};
        gap: ${i[2]};
        font-size: ${g.xs};
        color: ${t.gray[300]};
        cursor: ${$?"pointer":"default"};
        line-height: ${c.xs};
      `];if(r){const x=o`
          background: ${t.darkGray[500]};
        `;y.push(x)}return y},routesRow:r=>{const h=[o`
        flex: 1 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: ${g.xs};
        line-height: ${c.xs};
      `];if(!r){const y=o`
          color: ${t.gray[400]};
        `;h.push(y)}return h},routesRowInner:o`
      display: 'flex';
      align-items: 'center';
      flex-grow: 1;
      min-width: 0;
    `,routeParamInfo:o`
      color: ${t.gray[400]};
      font-size: ${g.xs};
      line-height: ${c.xs};
    `,nestedRouteRow:r=>o`
        margin-left: ${r?0:i[3.5]};
        border-left: ${r?"":`solid 1px ${t.gray[700]}`};
      `,code:o`
      font-size: ${g.xs};
      line-height: ${c.xs};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `,matchesContainer:o`
      flex: 1 1 auto;
      overflow-y: auto;
    `,cachedMatchesContainer:o`
      flex: 1 1 auto;
      overflow-y: auto;
      max-height: 50%;
    `,maskedBadgeContainer:o`
      flex: 1;
      justify-content: flex-end;
      display: flex;
    `,matchDetails:o`
      display: flex;
      flex-direction: column;
      padding: ${T.size[2]};
      font-size: ${T.font.size.xs};
      color: ${T.colors.gray[300]};
      line-height: ${T.font.lineHeight.sm};
    `,matchStatus:(r,$)=>{const y=$&&r==="success"?$==="beforeLoad"?"purple":"blue":{pending:"yellow",success:"green",error:"red",notFound:"purple",redirected:"gray"}[r];return o`
        display: flex;
        justify-content: center;
        align-items: center;
        height: 40px;
        border-radius: ${T.border.radius.sm};
        font-weight: ${T.font.weight.normal};
        background-color: ${T.colors[y][900]}${T.alpha[90]};
        color: ${T.colors[y][300]};
        border: 1px solid ${T.colors[y][600]};
        margin-bottom: ${T.size[2]};
        transition: all 0.25s ease-out;
      `},matchDetailsInfo:o`
      display: flex;
      justify-content: flex-end;
      flex: 1;
    `,matchDetailsInfoLabel:o`
      display: flex;
    `,mainCloseBtn:o`
      background: ${t.darkGray[700]};
      padding: ${i[1]} ${i[2]} ${i[1]} ${i[1.5]};
      border-radius: ${l.radius.md};
      position: fixed;
      z-index: 99999;
      display: inline-flex;
      width: fit-content;
      cursor: pointer;
      appearance: none;
      border: 0;
      gap: 8px;
      align-items: center;
      border: 1px solid ${t.gray[500]};
      font-size: ${n.size.xs};
      cursor: pointer;
      transition: all 0.25s ease-out;

      &:hover {
        background: ${t.darkGray[500]};
      }
    `,mainCloseBtnPosition:r=>o`
        ${r==="top-left"?`top: ${i[2]}; left: ${i[2]};`:""}
        ${r==="top-right"?`top: ${i[2]}; right: ${i[2]};`:""}
        ${r==="bottom-left"?`bottom: ${i[2]}; left: ${i[2]};`:""}
        ${r==="bottom-right"?`bottom: ${i[2]}; right: ${i[2]};`:""}
      `,mainCloseBtnAnimation:r=>r?o`
        opacity: 0;
        pointer-events: none;
        visibility: hidden;
      `:o`
          opacity: 1;
          pointer-events: auto;
          visibility: visible;
        `,routerLogoCloseButton:o`
      font-weight: ${n.weight.semibold};
      font-size: ${n.size.xs};
      background: linear-gradient(to right, #98f30c, #00f4a3);
      background-clip: text;
      -webkit-background-clip: text;
      line-height: 1;
      -webkit-text-fill-color: transparent;
      white-space: nowrap;
    `,mainCloseBtnDivider:o`
      width: 1px;
      background: ${T.colors.gray[600]};
      height: 100%;
      border-radius: 999999px;
      color: transparent;
    `,mainCloseBtnIconContainer:o`
      position: relative;
      width: ${i[5]};
      height: ${i[5]};
      background: pink;
      border-radius: 999999px;
      overflow: hidden;
    `,mainCloseBtnIconOuter:o`
      width: ${i[5]};
      height: ${i[5]};
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      filter: blur(3px) saturate(1.8) contrast(2);
    `,mainCloseBtnIconInner:o`
      width: ${i[4]};
      height: ${i[4]};
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `,panelCloseBtn:o`
      position: absolute;
      cursor: pointer;
      z-index: 100001;
      display: flex;
      align-items: center;
      justify-content: center;
      outline: none;
      background-color: ${t.darkGray[700]};
      &:hover {
        background-color: ${t.darkGray[500]};
      }

      top: 0;
      right: ${i[2]};
      transform: translate(0, -100%);
      border-right: ${t.darkGray[300]} 1px solid;
      border-left: ${t.darkGray[300]} 1px solid;
      border-top: ${t.darkGray[300]} 1px solid;
      border-bottom: none;
      border-radius: ${l.radius.sm} ${l.radius.sm} 0px 0px;
      padding: ${i[1]} ${i[1.5]} ${i[.5]} ${i[1.5]};

      &::after {
        content: ' ';
        position: absolute;
        top: 100%;
        left: -${i[2.5]};
        height: ${i[1.5]};
        width: calc(100% + ${i[5]});
      }
    `,panelCloseBtnIcon:o`
      color: ${t.gray[400]};
      width: ${i[2]};
      height: ${i[2]};
    `,navigateButton:o`
      background: none;
      border: none;
      padding: 0 0 0 4px;
      margin: 0;
      color: ${t.gray[400]};
      font-size: ${g.md};
      cursor: pointer;
      line-height: 1;
      vertical-align: middle;
      margin-right: 0.5ch;
      flex-shrink: 0;
      &:hover {
        color: ${t.blue[300]};
      }
    `}};function Me(){const e=xt(mt),[t]=ce(Nt(e));return t}const Vt=e=>{try{const t=localStorage.getItem(e);return typeof t=="string"?JSON.parse(t):void 0}catch{return}};function Ne(e,t){const[n,i]=ce();return Ie(()=>{const l=Vt(e);i(typeof l>"u"||l===null?typeof t=="function"?t():t:l)}),[n,l=>{i(a=>{let c=l;typeof l=="function"&&(c=l(a));try{localStorage.setItem(e,JSON.stringify(c))}catch{}return c})}]}var Jt=I('<span><svg xmlns=http://www.w3.org/2000/svg width=12 height=12 fill=none viewBox="0 0 24 24"><path stroke=currentColor stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 18l6-6-6-6">'),Le=I("<div>"),Yt=I("<button><span> "),qt=I("<div><div><button> [<!> ... <!>]"),Kt=I("<button><span></span> 🔄 "),Wt=I("<span>:"),Zt=I("<span>");const ht=({expanded:e,style:t={}})=>{const n=yt();return(()=>{var i=Jt(),p=i.firstChild;return F(l=>{var a=n().expander,c=Q(n().expanderIcon(e));return a!==l.e&&d(i,l.e=a),c!==l.t&&s(p,"class",l.t=c),l},{e:void 0,t:void 0}),i})()};function Qt(e,t){if(t<1)return[];let n=0;const i=[];for(;n<e.length;)i.push(e.slice(n,n+t)),n=n+t;return i}function Xt(e){return Symbol.iterator in e}function Fe({value:e,defaultExpanded:t,pageSize:n=100,filterSubEntries:i,...p}){const[l,a]=ce(!!t),c=()=>a(w=>!w),g=Y(()=>typeof e()),o=Y(()=>{let w=[];const le=S=>{const v=t===!0?{[S.label]:!0}:t==null?void 0:t[S.label];return{...S,value:()=>S.value,defaultExpanded:v}};return Array.isArray(e())?w=e().map((S,v)=>le({label:v.toString(),value:S})):e()!==null&&typeof e()=="object"&&Xt(e())&&typeof e()[Symbol.iterator]=="function"?w=Array.from(e(),(S,v)=>le({label:v.toString(),value:S})):typeof e()=="object"&&e()!==null&&(w=Object.entries(e()).map(([S,v])=>le({label:S,value:v}))),i?i(w):w}),r=Y(()=>Qt(o(),n)),[$,h]=ce([]),[y,x]=ce(void 0),_=yt(),j=()=>{x(e()())},q=w=>D(Fe,Ge({value:e,filterSubEntries:i},p,w));return(()=>{var w=Le();return u(w,(()=>{var le=Z(()=>!!r().length);return()=>le()?[(()=>{var S=Yt(),v=S.firstChild,G=v.firstChild;return S.$$click=()=>c(),u(S,D(ht,{get expanded(){return l()??!1}}),v),u(S,()=>p.label,v),u(v,()=>String(g).toLowerCase()==="iterable"?"(Iterable) ":"",G),u(v,()=>o().length,G),u(v,()=>o().length>1?"items":"item",null),F(ie=>{var se=_().expandButton,z=_().info;return se!==ie.e&&d(S,ie.e=se),z!==ie.t&&d(v,ie.t=z),ie},{e:void 0,t:void 0}),S})(),Z(()=>Z(()=>!!(l()??!1))()?Z(()=>r().length===1)()?(()=>{var S=Le();return u(S,()=>o().map((v,G)=>q(v))),F(()=>d(S,_().subEntries)),S})():(()=>{var S=Le();return u(S,()=>r().map((v,G)=>(()=>{var ie=qt(),se=ie.firstChild,z=se.firstChild,K=z.firstChild,ge=K.nextSibling,fe=ge.nextSibling,de=fe.nextSibling;return de.nextSibling,z.$$click=()=>h(N=>N.includes(G)?N.filter(X=>X!==G):[...N,G]),u(z,D(ht,{get expanded(){return $().includes(G)}}),K),u(z,G*n,ge),u(z,G*n+n-1,de),u(se,(()=>{var N=Z(()=>!!$().includes(G));return()=>N()?(()=>{var X=Le();return u(X,()=>v.map(re=>q(re))),F(()=>d(X,_().subEntries)),X})():null})(),null),F(N=>{var X=_().entry,re=Q(_().labelButton,"labelButton");return X!==N.e&&d(se,N.e=X),re!==N.t&&d(z,N.t=re),N},{e:void 0,t:void 0}),ie})())),F(()=>d(S,_().subEntries)),S})():null)]:(()=>{var S=Z(()=>g()==="function");return()=>S()?D(Fe,{get label(){return(()=>{var v=Kt(),G=v.firstChild;return v.$$click=j,u(G,()=>p.label),F(()=>d(v,_().refreshValueBtn)),v})()},value:y,defaultExpanded:{}}):[(()=>{var v=Wt(),G=v.firstChild;return u(v,()=>p.label,G),v})()," ",(()=>{var v=Zt();return u(v,()=>It(e())),F(()=>d(v,_().value)),v})()]})()})()),F(()=>d(w,_().entry)),w})()}const ei=e=>{const{colors:t,font:n,size:i}=T,{fontFamily:p,lineHeight:l,size:a}=n,c=e?ze.bind({target:e}):ze;return{entry:c`
      font-family: ${p.mono};
      font-size: ${a.xs};
      line-height: ${l.sm};
      outline: none;
      word-break: break-word;
    `,labelButton:c`
      cursor: pointer;
      color: inherit;
      font: inherit;
      outline: inherit;
      background: transparent;
      border: none;
      padding: 0;
    `,expander:c`
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: ${i[3]};
      height: ${i[3]};
      padding-left: 3px;
      box-sizing: content-box;
    `,expanderIcon:g=>g?c`
          transform: rotate(90deg);
          transition: transform 0.1s ease;
        `:c`
        transform: rotate(0deg);
        transition: transform 0.1s ease;
      `,expandButton:c`
      display: flex;
      gap: ${i[1]};
      align-items: center;
      cursor: pointer;
      color: inherit;
      font: inherit;
      outline: inherit;
      background: transparent;
      border: none;
      padding: 0;
    `,value:c`
      color: ${t.purple[400]};
    `,subEntries:c`
      margin-left: ${i[2]};
      padding-left: ${i[2]};
      border-left: 2px solid ${t.darkGray[400]};
    `,info:c`
      color: ${t.gray[500]};
      font-size: ${a["2xs"]};
      padding-left: ${i[1]};
    `,refreshValueBtn:c`
      appearance: none;
      border: 0;
      cursor: pointer;
      background: transparent;
      color: inherit;
      padding: 0;
      font-family: ${p.mono};
      font-size: ${a.xs};
    `}};function yt(){const e=xt(mt),[t]=ce(ei(e));return t}Ze(["click"]);var ti=I("<div><div></div><div>/</div><div></div><div>/</div><div>");function Ve(e){const t=["s","min","h","d"],n=[e/1e3,e/6e4,e/36e5,e/864e5];let i=0;for(let l=1;l<n.length&&!(n[l]<1);l++)i=l;return new Intl.NumberFormat(navigator.language,{compactDisplay:"short",notation:"compact",maximumFractionDigits:0}).format(n[i])+t[i]}function qe({match:e,router:t}){const n=Me();if(!e)return null;const i=t().looseRoutesById[e.routeId];if(!i.options.loader)return null;const p=Date.now()-e.updatedAt,l=i.options.staleTime??t().options.defaultStaleTime??0,a=i.options.gcTime??t().options.defaultGcTime??30*60*1e3;return(()=>{var c=ti(),g=c.firstChild,o=g.nextSibling,r=o.nextSibling,$=r.nextSibling,h=$.nextSibling;return u(g,()=>Ve(p)),u(r,()=>Ve(l)),u(h,()=>Ve(a)),F(()=>d(c,Q(n().ageTicker(p>l)))),c})()}var ii=I("<button type=button>➔");function Ke({to:e,params:t,search:n,router:i}){const p=Me();return(()=>{var l=ii();return l.$$click=a=>{a.stopPropagation(),i().navigate({to:e,params:t,search:n})},s(l,"title",`Navigate to ${e}`),F(()=>d(l,p().navigateButton)),l})()}Ze(["click"]);var ri=I("<button><div>TANSTACK</div><div>TanStack Router v1"),ni=I("<div><div>"),oi=I("<code> "),je=I("<code>"),li=I("<div><div role=button><div>"),He=I("<div>"),si=I('<div><button><svg xmlns=http://www.w3.org/2000/svg width=10 height=6 fill=none viewBox="0 0 10 6"><path stroke=currentColor stroke-linecap=round stroke-linejoin=round stroke-width=1.667 d="M1 1l4 4 4-4"></path></svg></button><div><div></div><div><div></div></div></div><div><div><div><span>Pathname</span></div><div><code></code></div><div><div><button type=button>Routes</button><button type=button>Matches</button></div><div><div>age / staleTime / gcTime</div></div></div><div>'),ai=I("<div><span>masked"),vt=I("<div role=button><div>"),di=I("<div><div><div>Cached Matches</div><div>age / staleTime / gcTime</div></div><div>"),ci=I("<div><div>Match Details</div><div><div><div><div></div></div><div><div>ID:</div><div><code></code></div></div><div><div>State:</div><div></div></div><div><div>Last Updated:</div><div></div></div></div></div><div>Explorer</div><div>"),fi=I("<div>Loader Data"),ui=I("<div><div><span>Search Params</span></div><div>"),gi=I("<span style=margin-left:0.5rem;>"),pi=I('<button type=button style=cursor:pointer; aria-label="Copy value to clipboard">');function hi(e){const{className:t,...n}=e,i=Me();return(()=>{var p=ri(),l=p.firstChild,a=l.nextSibling;return Qe(p,Ge(n,{get class(){return Q(i().logo,t?t():"")}}),!1,!0),F(c=>{var g=i().tanstackLogo,o=i().routerLogo;return g!==c.e&&d(l,c.e=g),o!==c.t&&d(a,c.t=o),c},{e:void 0,t:void 0}),p})()}function We(e){return(()=>{var t=ni(),n=t.firstChild;return t.style.setProperty("display","flex"),t.style.setProperty("align-items","center"),t.style.setProperty("width","100%"),u(t,()=>e.left,n),n.style.setProperty("flex-grow","1"),n.style.setProperty("min-width","0"),u(n,()=>e.children),u(t,()=>e.right,null),F(()=>d(t,e.class)),t})()}function kt({routerState:e,router:t,route:n,isRoot:i,activeId:p,setActiveId:l}){const a=Me(),c=Y(()=>e().pendingMatches||e().matches),g=Y(()=>e().matches.find($=>$.routeId===n.id)),o=Y(()=>{var $,h;try{if(($=g())!=null&&$.params){const y=(h=g())==null?void 0:h.params,x=n.path||gt(n.id);if(x.startsWith("$")){const _=x.slice(1);if(y[_])return`(${y[_]})`}}return""}catch{return""}}),r=Y(()=>{if(i||!n.path)return;const $=Object.assign({},...c().map(y=>y.params)),h=Ft({path:n.fullPath,params:$,leaveWildcards:!1,leaveParams:!1,decodeCharMap:t().pathParamsDecodeCharMap});return h.isMissingParams?void 0:h.interpolatedPath});return(()=>{var $=li(),h=$.firstChild,y=h.firstChild;return h.$$click=()=>{g()&&l(p()===n.id?"":n.id)},u(h,D(We,{get class(){return Q(a().routesRow(!!g()))},get left(){return D(zt,{get when(){return r()},children:x=>D(Ke,{get to(){return x()},router:t})})},get right(){return D(qe,{get match(){return g()},router:t})},get children(){return[(()=>{var x=oi(),_=x.firstChild;return u(x,()=>i?Je:n.path||gt(n.id),_),F(()=>d(x,a().code)),x})(),(()=>{var x=je();return u(x,o),F(()=>d(x,a().routeParamInfo)),x})()]}}),null),u($,(()=>{var x=Z(()=>{var _;return!!((_=n.children)!=null&&_.length)});return()=>x()?(()=>{var _=He();return u(_,()=>[...n.children].sort((j,q)=>j.rank-q.rank).map(j=>D(kt,{routerState:e,router:t,route:j,activeId:p,setActiveId:l}))),F(()=>d(_,a().nestedRouteRow(!!i))),_})():null})(),null),F(x=>{var _=`Open match details for ${n.id}`,j=Q(a().routesRowContainer(n.id===p(),!!g())),q=Q(a().matchIndicator(Et(c(),n)));return _!==x.e&&s(h,"aria-label",x.e=_),j!==x.t&&d(h,x.t=j),q!==x.a&&d(y,x.a=q),x},{e:void 0,t:void 0,a:void 0}),$})()}const vi=function({...t}){const{isOpen:n=!0,setIsOpen:i,handleDragStart:p,router:l,routerState:a,shadowDOMTarget:c,...g}=t,{onCloseClick:o}=St(),r=Me(),{className:$,style:h,...y}=g;wt(l);const[x,_]=Ne("tanstackRouterDevtoolsShowMatches",!0),[j,q]=Ne("tanstackRouterDevtoolsActiveRouteId",""),w=Y(()=>[...a().pendingMatches??[],...a().matches,...a().cachedMatches].find(K=>K.routeId===j()||K.id===j())),le=Y(()=>Object.keys(a().location.search).length),S=Y(()=>({...l(),state:a()})),v=Y(()=>Object.fromEntries(Gt(Object.keys(S()),["state","routesById","routesByPath","flatRoutes","options","manifest"].map(z=>K=>K!==z)).map(z=>[z,S()[z]]).filter(z=>typeof z[1]!="function"&&!["__store","basepath","injectedHtml","subscribers","latestLoadPromise","navigateTimeout","resetNextScroll","tempLocationKey","latestLocation","routeTree","history"].includes(z[0])))),G=Y(()=>{var z;return(z=w())==null?void 0:z.loaderData}),ie=Y(()=>w()),se=Y(()=>a().location.search);return(()=>{var z=si(),K=z.firstChild,ge=K.firstChild,fe=K.nextSibling,de=fe.firstChild,N=de.nextSibling,X=N.firstChild,re=fe.nextSibling,Se=re.firstChild,pe=Se.firstChild;pe.firstChild;var U=pe.nextSibling,V=U.firstChild,W=U.nextSibling,H=W.firstChild,J=H.firstChild,ne=J.nextSibling,O=H.nextSibling,ee=W.nextSibling;return Qe(z,Ge({get class(){return Q(r().devtoolsPanel,"TanStackRouterDevtoolsPanel",$?$():"")},get style(){return h?h():""}},y),!1,!0),u(z,p?(()=>{var f=He();return _t(f,"mousedown",p,!0),F(()=>d(f,r().dragHandle)),f})():null,K),K.$$click=f=>{i&&i(!1),o(f)},u(de,D(hi,{"aria-hidden":!0,onClick:f=>{i&&i(!1),o(f)}})),u(X,D(Fe,{label:"Router",value:v,defaultExpanded:{state:{},context:{},options:{}},filterSubEntries:f=>f.filter(k=>typeof k.value()!="function")})),u(pe,(()=>{var f=Z(()=>!!a().location.maskedLocation);return()=>f()?(()=>{var k=ai(),M=k.firstChild;return F(P=>{var m=r().maskedBadgeContainer,L=r().maskedBadge;return m!==P.e&&d(k,P.e=m),L!==P.t&&d(M,P.t=L),P},{e:void 0,t:void 0}),k})():null})(),null),u(V,()=>a().location.pathname),u(U,(()=>{var f=Z(()=>!!a().location.maskedLocation);return()=>f()?(()=>{var k=je();return u(k,()=>{var M;return(M=a().location.maskedLocation)==null?void 0:M.pathname}),F(()=>d(k,r().maskedLocation)),k})():null})(),null),J.$$click=()=>{_(!1)},ne.$$click=()=>{_(!0)},u(ee,(()=>{var f=Z(()=>!x());return()=>f()?D(kt,{routerState:a,router:l,get route(){return l().routeTree},isRoot:!0,activeId:j,setActiveId:q}):(()=>{var k=He();return u(k,()=>{var M,P;return(P=(M=a().pendingMatches)!=null&&M.length?a().pendingMatches:a().matches)==null?void 0:P.map((m,L)=>(()=>{var C=vt(),A=C.firstChild;return C.$$click=()=>q(j()===m.id?"":m.id),u(C,D(We,{get left(){return D(Ke,{get to(){return m.pathname},get params(){return m.params},get search(){return m.search},router:l})},get right(){return D(qe,{match:m,router:l})},get children(){var R=je();return u(R,()=>`${m.routeId===Je?Je:m.pathname}`),F(()=>d(R,r().matchID)),R}}),null),F(R=>{var E=`Open match details for ${m.id}`,ae=Q(r().matchRow(m===w())),te=Q(r().matchIndicator(Ye(m)));return E!==R.e&&s(C,"aria-label",R.e=E),ae!==R.t&&d(C,R.t=ae),te!==R.a&&d(A,R.a=te),R},{e:void 0,t:void 0,a:void 0}),C})())}),k})()})()),u(re,(()=>{var f=Z(()=>!!a().cachedMatches.length);return()=>f()?(()=>{var k=di(),M=k.firstChild,P=M.firstChild,m=P.nextSibling,L=M.nextSibling;return u(L,()=>a().cachedMatches.map(C=>(()=>{var A=vt(),R=A.firstChild;return A.$$click=()=>q(j()===C.id?"":C.id),u(A,D(We,{get left(){return D(Ke,{get to(){return C.pathname},get params(){return C.params},get search(){return C.search},router:l})},get right(){return D(qe,{match:C,router:l})},get children(){var E=je();return u(E,()=>`${C.id}`),F(()=>d(E,r().matchID)),E}}),null),F(E=>{var ae=`Open match details for ${C.id}`,te=Q(r().matchRow(C===w())),ue=Q(r().matchIndicator(Ye(C)));return ae!==E.e&&s(A,"aria-label",E.e=ae),te!==E.t&&d(A,E.t=te),ue!==E.a&&d(R,E.a=ue),E},{e:void 0,t:void 0,a:void 0}),A})())),F(C=>{var A=r().cachedMatchesContainer,R=r().detailsHeader,E=r().detailsHeaderInfo;return A!==C.e&&d(k,C.e=A),R!==C.t&&d(M,C.t=R),E!==C.a&&d(m,C.a=E),C},{e:void 0,t:void 0,a:void 0}),k})():null})(),null),u(z,(()=>{var f=Z(()=>{var k;return!!(w()&&((k=w())!=null&&k.status))});return()=>f()?(()=>{var k=ci(),M=k.firstChild,P=M.nextSibling,m=P.firstChild,L=m.firstChild,C=L.firstChild,A=L.nextSibling,R=A.firstChild,E=R.nextSibling,ae=E.firstChild,te=A.nextSibling,ue=te.firstChild,$e=ue.nextSibling,xe=te.nextSibling,be=xe.firstChild,me=be.nextSibling,he=P.nextSibling,ye=he.nextSibling;return u(C,(()=>{var b=Z(()=>{var B,oe;return!!(((B=w())==null?void 0:B.status)==="success"&&((oe=w())!=null&&oe.isFetching))});return()=>{var B;return b()?"fetching":(B=w())==null?void 0:B.status}})()),u(ae,()=>{var b;return(b=w())==null?void 0:b.id}),u($e,(()=>{var b=Z(()=>{var B;return!!((B=a().pendingMatches)!=null&&B.find(oe=>{var ke;return oe.id===((ke=w())==null?void 0:ke.id)}))});return()=>b()?"Pending":a().matches.find(B=>{var oe;return B.id===((oe=w())==null?void 0:oe.id)})?"Active":"Cached"})()),u(me,(()=>{var b=Z(()=>{var B;return!!((B=w())!=null&&B.updatedAt)});return()=>{var B;return b()?new Date((B=w())==null?void 0:B.updatedAt).toLocaleTimeString():"N/A"}})()),u(k,(()=>{var b=Z(()=>!!G());return()=>b()?[(()=>{var B=fi();return F(()=>d(B,r().detailsHeader)),B})(),(()=>{var B=He();return u(B,D(Fe,{label:"loaderData",value:G,defaultExpanded:{}})),F(()=>d(B,r().detailsContent)),B})()]:null})(),he),u(ye,D(Fe,{label:"Match",value:ie,defaultExpanded:{}})),F(b=>{var Ee,Te;var B=r().thirdContainer,oe=r().detailsHeader,ke=r().matchDetails,Ue=r().matchStatus((Ee=w())==null?void 0:Ee.status,(Te=w())==null?void 0:Te.isFetching),we=r().matchDetailsInfoLabel,Be=r().matchDetailsInfo,Pe=r().matchDetailsInfoLabel,_e=r().matchDetailsInfo,Ae=r().matchDetailsInfoLabel,De=r().matchDetailsInfo,Re=r().detailsHeader,Oe=r().detailsContent;return B!==b.e&&d(k,b.e=B),oe!==b.t&&d(M,b.t=oe),ke!==b.a&&d(m,b.a=ke),Ue!==b.o&&d(L,b.o=Ue),we!==b.i&&d(A,b.i=we),Be!==b.n&&d(E,b.n=Be),Pe!==b.s&&d(te,b.s=Pe),_e!==b.h&&d($e,b.h=_e),Ae!==b.r&&d(xe,b.r=Ae),De!==b.d&&d(me,b.d=De),Re!==b.l&&d(he,b.l=Re),Oe!==b.u&&d(ye,b.u=Oe),b},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0,r:void 0,d:void 0,l:void 0,u:void 0}),k})():null})(),null),u(z,(()=>{var f=Z(()=>!!le());return()=>f()?(()=>{var k=ui(),M=k.firstChild;M.firstChild;var P=M.nextSibling;return u(M,typeof navigator<"u"?(()=>{var m=gi();return u(m,D($i,{getValue:()=>{const L=a().location.search;return JSON.stringify(L)}})),m})():null,null),u(P,D(Fe,{value:se,get defaultExpanded(){return Object.keys(a().location.search).reduce((m,L)=>(m[L]={},m),{})}})),F(m=>{var L=r().fourthContainer,C=r().detailsHeader,A=r().detailsContent;return L!==m.e&&d(k,m.e=L),C!==m.t&&d(M,m.t=C),A!==m.a&&d(P,m.a=A),m},{e:void 0,t:void 0,a:void 0}),k})():null})(),null),F(f=>{var k=r().panelCloseBtn,M=r().panelCloseBtnIcon,P=r().firstContainer,m=r().row,L=r().routerExplorerContainer,C=r().routerExplorer,A=r().secondContainer,R=r().matchesContainer,E=r().detailsHeader,ae=r().detailsContent,te=r().detailsHeader,ue=r().routeMatchesToggle,$e=!x(),xe=Q(r().routeMatchesToggleBtn(!x(),!0)),be=x(),me=Q(r().routeMatchesToggleBtn(!!x(),!1)),he=r().detailsHeaderInfo,ye=Q(r().routesContainer);return k!==f.e&&d(K,f.e=k),M!==f.t&&s(ge,"class",f.t=M),P!==f.a&&d(fe,f.a=P),m!==f.o&&d(de,f.o=m),L!==f.i&&d(N,f.i=L),C!==f.n&&d(X,f.n=C),A!==f.s&&d(re,f.s=A),R!==f.h&&d(Se,f.h=R),E!==f.r&&d(pe,f.r=E),ae!==f.d&&d(U,f.d=ae),te!==f.l&&d(W,f.l=te),ue!==f.u&&d(H,f.u=ue),$e!==f.c&&(J.disabled=f.c=$e),xe!==f.w&&d(J,f.w=xe),be!==f.m&&(ne.disabled=f.m=be),me!==f.f&&d(ne,f.f=me),he!==f.y&&d(O,f.y=he),ye!==f.g&&d(ee,f.g=ye),f},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0,r:void 0,d:void 0,l:void 0,u:void 0,c:void 0,w:void 0,m:void 0,f:void 0,y:void 0,g:void 0}),z})()};function $i({getValue:e}){const[t,n]=ce(!1);let i=null;const p=async()=>{var l;if(typeof navigator>"u"||!((l=navigator.clipboard)!=null&&l.writeText)){console.warn("TanStack Router Devtools: Clipboard API unavailable");return}try{const a=e();await navigator.clipboard.writeText(a),n(!0),i&&clearTimeout(i),i=setTimeout(()=>n(!1),2500)}catch(a){console.error("TanStack Router Devtools: Failed to copy",a)}};return Mt(()=>{i&&clearTimeout(i)}),(()=>{var l=pi();return l.$$click=p,u(l,()=>t()?"✅":"📋"),F(()=>s(l,"title",t()?"Copied!":"Copy")),l})()}Ze(["click","mousedown"]);var xi=I('<svg xmlns=http://www.w3.org/2000/svg enable-background="new 0 0 634 633"viewBox="0 0 634 633"><g transform=translate(1)><linearGradient x1=-641.486 x2=-641.486 y1=856.648 y2=855.931 gradientTransform="matrix(633 0 0 -633 406377 542258)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#6bdaff></stop><stop offset=0.319 stop-color=#f9ffb5></stop><stop offset=0.706 stop-color=#ffa770></stop><stop offset=1 stop-color=#ff7373></stop></linearGradient><circle cx=316.5 cy=316.5 r=316.5 fill-rule=evenodd clip-rule=evenodd></circle><defs><filter width=454 height=396.9 x=-137.5 y=412 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=454 height=396.9 x=-137.5 y=412 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><ellipse cx=89.5 cy=610.5 fill=#015064 fill-rule=evenodd stroke=#00CFE2 stroke-width=25 clip-rule=evenodd rx=214.5 ry=186></ellipse><defs><filter width=454 height=396.9 x=316.5 y=412 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=454 height=396.9 x=316.5 y=412 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><ellipse cx=543.5 cy=610.5 fill=#015064 fill-rule=evenodd stroke=#00CFE2 stroke-width=25 clip-rule=evenodd rx=214.5 ry=186></ellipse><defs><filter width=454 height=396.9 x=-137.5 y=450 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=454 height=396.9 x=-137.5 y=450 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><ellipse cx=89.5 cy=648.5 fill=#015064 fill-rule=evenodd stroke=#00A8B8 stroke-width=25 clip-rule=evenodd rx=214.5 ry=186></ellipse><defs><filter width=454 height=396.9 x=316.5 y=450 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=454 height=396.9 x=316.5 y=450 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><ellipse cx=543.5 cy=648.5 fill=#015064 fill-rule=evenodd stroke=#00A8B8 stroke-width=25 clip-rule=evenodd rx=214.5 ry=186></ellipse><defs><filter width=454 height=396.9 x=-137.5 y=486 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=454 height=396.9 x=-137.5 y=486 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><ellipse cx=89.5 cy=684.5 fill=#015064 fill-rule=evenodd stroke=#007782 stroke-width=25 clip-rule=evenodd rx=214.5 ry=186></ellipse><defs><filter width=454 height=396.9 x=316.5 y=486 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=454 height=396.9 x=316.5 y=486 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><ellipse cx=543.5 cy=684.5 fill=#015064 fill-rule=evenodd stroke=#007782 stroke-width=25 clip-rule=evenodd rx=214.5 ry=186></ellipse><defs><filter width=176.9 height=129.3 x=272.2 y=308 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=176.9 height=129.3 x=272.2 y=308 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><g><path fill=none stroke=#000 stroke-linecap=round stroke-linejoin=bevel stroke-width=11 d="M436 403.2l-5 28.6m-140-90.3l-10.9 62m52.8-19.4l-4.3 27.1"></path><linearGradient x1=-645.656 x2=-646.499 y1=854.878 y2=854.788 gradientTransform="matrix(-184.159 -32.4722 11.4608 -64.9973 -128419.844 34938.836)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ee2700></stop><stop offset=1 stop-color=#ff008e></stop></linearGradient><path fill-rule=evenodd d="M344.1 363l97.7 17.2c5.8 2.1 8.2 6.2 7.1 12.1-1 5.9-4.7 9.2-11 9.9l-106-18.7-57.5-59.2c-3.2-4.8-2.9-9.1.8-12.8 3.7-3.7 8.3-4.4 13.7-2.1l55.2 53.6z"clip-rule=evenodd></path><path fill=#D8D8D8 fill-rule=evenodd stroke=#FFF stroke-linecap=round stroke-linejoin=bevel stroke-width=7 d="M428.3 384.5l.9-6.5m-33.9 1.5l.9-6.5m-34 .5l.9-6.1m-38.9-16.1l4.2-3.9m-25.2-16.1l4.2-3.9"clip-rule=evenodd></path></g><defs><filter width=280.6 height=317.4 x=73.2 y=113.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=280.6 height=317.4 x=73.2 y=113.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><g><linearGradient x1=-646.8 x2=-646.8 y1=854.844 y2=853.844 gradientTransform="matrix(-100.1751 48.8587 -97.9753 -200.879 19124.773 203538.61)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#a17500></stop><stop offset=1 stop-color=#5d2100></stop></linearGradient><path fill-rule=evenodd d="M192.3 203c8.1 37.3 14 73.6 17.8 109.1 3.8 35.4 2.8 75.2-2.9 119.2l61.2-16.7c-15.6-59-25.2-97.9-28.6-116.6-3.4-18.7-10.8-51.8-22.2-99.6l-25.3 4.6"clip-rule=evenodd></path><linearGradient x1=-635.467 x2=-635.467 y1=852.115 y2=851.115 gradientTransform="matrix(92.6873 4.8575 2.0257 -38.6535 57323.695 36176.047)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#2f8a00></stop><stop offset=1 stop-color=#90ff57></stop></linearGradient><path fill-rule=evenodd stroke=#2F8A00 stroke-width=13 d="M195 183.9s-12.6-22.1-36.5-29.9c-15.9-5.2-34.4-1.5-55.5 11.1 15.9 14.3 29.5 22.6 40.7 24.9 16.8 3.6 51.3-6.1 51.3-6.1z"clip-rule=evenodd></path><linearGradient x1=-636.573 x2=-636.573 y1=855.444 y2=854.444 gradientTransform="matrix(109.9945 5.7646 6.3597 -121.3507 64719.133 107659.336)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#2f8a00></stop><stop offset=1 stop-color=#90ff57></stop></linearGradient><path fill-rule=evenodd stroke=#2F8A00 stroke-width=13 d="M194.9 184.5s-47.5-8.5-83.2 15.7c-23.8 16.2-34.3 49.3-31.6 99.3 30.3-27.8 52.1-48.5 65.2-61.9 19.8-20 49.6-53.1 49.6-53.1z"clip-rule=evenodd></path><linearGradient x1=-632.145 x2=-632.145 y1=854.174 y2=853.174 gradientTransform="matrix(62.9558 3.2994 3.5021 -66.8246 37035.367 59284.227)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#2f8a00></stop><stop offset=1 stop-color=#90ff57></stop></linearGradient><path fill-rule=evenodd stroke=#2F8A00 stroke-width=13 d="M195 183.9c-.8-21.9 6-38 20.6-48.2 14.6-10.2 29.8-15.3 45.5-15.3-6.1 21.4-14.5 35.8-25.2 43.4-10.7 7.5-24.4 14.2-40.9 20.1z"clip-rule=evenodd></path><linearGradient x1=-638.224 x2=-638.224 y1=853.801 y2=852.801 gradientTransform="matrix(152.4666 7.9904 3.0934 -59.0251 94939.86 55646.855)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#2f8a00></stop><stop offset=1 stop-color=#90ff57></stop></linearGradient><path fill-rule=evenodd stroke=#2F8A00 stroke-width=13 d="M194.9 184.5c31.9-30 64.1-39.7 96.7-29 32.6 10.7 50.8 30.4 54.6 59.1-35.2-5.5-60.4-9.6-75.8-12.1-15.3-2.6-40.5-8.6-75.5-18z"clip-rule=evenodd></path><linearGradient x1=-637.723 x2=-637.723 y1=855.103 y2=854.103 gradientTransform="matrix(136.467 7.1519 5.2165 -99.5377 82830.875 89859.578)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#2f8a00></stop><stop offset=1 stop-color=#90ff57></stop></linearGradient><path fill-rule=evenodd stroke=#2F8A00 stroke-width=13 d="M194.9 184.5c35.8-7.6 65.6-.2 89.2 22 23.6 22.2 37.7 49 42.3 80.3-39.8-9.7-68.3-23.8-85.5-42.4-17.2-18.5-32.5-38.5-46-59.9z"clip-rule=evenodd></path><linearGradient x1=-631.79 x2=-631.79 y1=855.872 y2=854.872 gradientTransform="matrix(60.8683 3.19 8.7771 -167.4773 31110.818 145537.61)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#2f8a00></stop><stop offset=1 stop-color=#90ff57></stop></linearGradient><path fill-rule=evenodd stroke=#2F8A00 stroke-width=13 d="M194.9 184.5c-33.6 13.8-53.6 35.7-60.1 65.6-6.5 29.9-3.6 63.1 8.7 99.6 27.4-40.3 43.2-69.6 47.4-88 4.2-18.3 5.5-44.1 4-77.2z"clip-rule=evenodd></path><path fill=none stroke=#2F8A00 stroke-linecap=round stroke-width=8 d="M196.5 182.3c-14.8 21.6-25.1 41.4-30.8 59.4-5.7 18-9.4 33-11.1 45.1"></path><path fill=none stroke=#2F8A00 stroke-linecap=round stroke-width=8 d="M194.8 185.7c-24.4 1.7-43.8 9-58.1 21.8-14.3 12.8-24.7 25.4-31.3 37.8m99.1-68.9c29.7-6.7 52-8.4 67-5 15 3.4 26.9 8.7 35.8 15.9m-110.8-5.9c20.3 9.9 38.2 20.5 53.9 31.9 15.7 11.4 27.4 22.1 35.1 32"></path></g><defs><filter width=532 height=633 x=50.5 y=399 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=532 height=633 x=50.5 y=399 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><linearGradient x1=-641.104 x2=-641.278 y1=856.577 y2=856.183 gradientTransform="matrix(532 0 0 -633 341484.5 542657)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#fff400></stop><stop offset=1 stop-color=#3c8700></stop></linearGradient><ellipse cx=316.5 cy=715.5 fill-rule=evenodd clip-rule=evenodd rx=266 ry=316.5></ellipse><defs><filter width=288 height=283 x=391 y=-24 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"></feColorMatrix></filter></defs><mask width=288 height=283 x=391 y=-24 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#FFF fill-rule=evenodd clip-rule=evenodd></circle></g></mask><g><g transform="translate(397 -24)"><linearGradient x1=-1036.672 x2=-1036.672 y1=880.018 y2=879.018 gradientTransform="matrix(227 0 0 -227 235493 199764)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffdf00></stop><stop offset=1 stop-color=#ff9d00></stop></linearGradient><circle cx=168.5 cy=113.5 r=113.5 fill-rule=evenodd clip-rule=evenodd></circle><linearGradient x1=-1017.329 x2=-1018.602 y1=658.003 y2=657.998 gradientTransform="matrix(30 0 0 -1 30558 771)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M30 113H0"></path><linearGradient x1=-1014.501 x2=-1015.774 y1=839.985 y2=839.935 gradientTransform="matrix(26.5 0 0 -5.5 26925 4696.5)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M33.5 79.5L7 74"></path><linearGradient x1=-1016.59 x2=-1017.862 y1=852.671 y2=852.595 gradientTransform="matrix(29 0 0 -8 29523 6971)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M34 146l-29 8"></path><linearGradient x1=-1011.984 x2=-1013.257 y1=863.523 y2=863.229 gradientTransform="matrix(24 0 0 -13 24339 11407)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M45 177l-24 13"></path><linearGradient x1=-1006.673 x2=-1007.946 y1=869.279 y2=868.376 gradientTransform="matrix(20 0 0 -19 20205 16720)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M67 204l-20 19"></path><linearGradient x1=-992.85 x2=-993.317 y1=871.258 y2=870.258 gradientTransform="matrix(13.8339 0 0 -22.8467 13825.796 20131.938)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M94.4 227l-13.8 22.8"></path><linearGradient x1=-953.835 x2=-953.965 y1=871.9 y2=870.9 gradientTransform="matrix(7.5 0 0 -24.5 7278 21605)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M127.5 243.5L120 268"></path><linearGradient x1=244.504 x2=244.496 y1=871.898 y2=870.898 gradientTransform="matrix(.5 0 0 -24.5 45.5 21614)"gradientUnits=userSpaceOnUse><stop offset=0 stop-color=#ffa400></stop><stop offset=1 stop-color=#ff5e00></stop></linearGradient><path fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12 d="M167.5 252.5l.5 24.5">');function $t(){const e=Ut();return(()=>{var t=xi(),n=t.firstChild,i=n.firstChild,p=i.nextSibling,l=p.nextSibling,a=l.firstChild,c=l.nextSibling,g=c.firstChild,o=c.nextSibling,r=o.nextSibling,$=r.firstChild,h=r.nextSibling,y=h.firstChild,x=h.nextSibling,_=x.nextSibling,j=_.firstChild,q=_.nextSibling,w=q.firstChild,le=q.nextSibling,S=le.nextSibling,v=S.firstChild,G=S.nextSibling,ie=G.firstChild,se=G.nextSibling,z=se.nextSibling,K=z.firstChild,ge=z.nextSibling,fe=ge.firstChild,de=ge.nextSibling,N=de.nextSibling,X=N.firstChild,re=N.nextSibling,Se=re.firstChild,pe=re.nextSibling,U=pe.nextSibling,V=U.firstChild,W=U.nextSibling,H=W.firstChild,J=W.nextSibling,ne=J.firstChild,O=ne.nextSibling,ee=O.nextSibling,f=J.nextSibling,k=f.firstChild,M=f.nextSibling,P=M.firstChild,m=M.nextSibling,L=m.firstChild,C=L.nextSibling,A=C.nextSibling,R=A.nextSibling,E=R.nextSibling,ae=E.nextSibling,te=ae.nextSibling,ue=te.nextSibling,$e=ue.nextSibling,xe=$e.nextSibling,be=xe.nextSibling,me=be.nextSibling,he=me.nextSibling,ye=he.nextSibling,b=m.nextSibling,B=b.firstChild,oe=b.nextSibling,ke=oe.firstChild,Ue=oe.nextSibling,we=Ue.nextSibling,Be=we.nextSibling,Pe=Be.firstChild,_e=Be.nextSibling,Ae=_e.firstChild,De=_e.nextSibling,Re=De.firstChild,Oe=Re.firstChild,Ee=Oe.nextSibling,Te=Ee.nextSibling,Xe=Te.nextSibling,et=Xe.nextSibling,tt=et.nextSibling,it=tt.nextSibling,rt=it.nextSibling,nt=rt.nextSibling,ot=nt.nextSibling,lt=ot.nextSibling,st=lt.nextSibling,at=st.nextSibling,dt=at.nextSibling,ct=dt.nextSibling,ft=ct.nextSibling,ut=ft.nextSibling,Ct=ut.nextSibling;return s(i,"id",`a-${e}`),s(p,"fill",`url(#a-${e})`),s(a,"id",`b-${e}`),s(c,"id",`c-${e}`),s(g,"filter",`url(#b-${e})`),s(o,"mask",`url(#c-${e})`),s($,"id",`d-${e}`),s(h,"id",`e-${e}`),s(y,"filter",`url(#d-${e})`),s(x,"mask",`url(#e-${e})`),s(j,"id",`f-${e}`),s(q,"id",`g-${e}`),s(w,"filter",`url(#f-${e})`),s(le,"mask",`url(#g-${e})`),s(v,"id",`h-${e}`),s(G,"id",`i-${e}`),s(ie,"filter",`url(#h-${e})`),s(se,"mask",`url(#i-${e})`),s(K,"id",`j-${e}`),s(ge,"id",`k-${e}`),s(fe,"filter",`url(#j-${e})`),s(de,"mask",`url(#k-${e})`),s(X,"id",`l-${e}`),s(re,"id",`m-${e}`),s(Se,"filter",`url(#l-${e})`),s(pe,"mask",`url(#m-${e})`),s(V,"id",`n-${e}`),s(W,"id",`o-${e}`),s(H,"filter",`url(#n-${e})`),s(J,"mask",`url(#o-${e})`),s(O,"id",`p-${e}`),s(ee,"fill",`url(#p-${e})`),s(k,"id",`q-${e}`),s(M,"id",`r-${e}`),s(P,"filter",`url(#q-${e})`),s(m,"mask",`url(#r-${e})`),s(L,"id",`s-${e}`),s(C,"fill",`url(#s-${e})`),s(A,"id",`t-${e}`),s(R,"fill",`url(#t-${e})`),s(E,"id",`u-${e}`),s(ae,"fill",`url(#u-${e})`),s(te,"id",`v-${e}`),s(ue,"fill",`url(#v-${e})`),s($e,"id",`w-${e}`),s(xe,"fill",`url(#w-${e})`),s(be,"id",`x-${e}`),s(me,"fill",`url(#x-${e})`),s(he,"id",`y-${e}`),s(ye,"fill",`url(#y-${e})`),s(B,"id",`z-${e}`),s(oe,"id",`A-${e}`),s(ke,"filter",`url(#z-${e})`),s(Ue,"id",`B-${e}`),s(we,"fill",`url(#B-${e})`),s(we,"mask",`url(#A-${e})`),s(Pe,"id",`C-${e}`),s(_e,"id",`D-${e}`),s(Ae,"filter",`url(#C-${e})`),s(De,"mask",`url(#D-${e})`),s(Oe,"id",`E-${e}`),s(Ee,"fill",`url(#E-${e})`),s(Te,"id",`F-${e}`),s(Xe,"stroke",`url(#F-${e})`),s(et,"id",`G-${e}`),s(tt,"stroke",`url(#G-${e})`),s(it,"id",`H-${e}`),s(rt,"stroke",`url(#H-${e})`),s(nt,"id",`I-${e}`),s(ot,"stroke",`url(#I-${e})`),s(lt,"id",`J-${e}`),s(st,"stroke",`url(#J-${e})`),s(at,"id",`K-${e}`),s(dt,"stroke",`url(#K-${e})`),s(ct,"id",`L-${e}`),s(ft,"stroke",`url(#L-${e})`),s(ut,"id",`M-${e}`),s(Ct,"stroke",`url(#M-${e})`),t})()}var mi=I("<button type=button><div><div></div><div></div></div><div>-</div><div>TanStack Router");function yi({initialIsOpen:e,panelProps:t={},closeButtonProps:n={},toggleButtonProps:i={},position:p="bottom-left",containerElement:l="footer",router:a,routerState:c,shadowDOMTarget:g}){const[o,r]=ce();let $;const[h,y]=Ne("tanstackRouterDevtoolsOpen",e),[x,_]=Ne("tanstackRouterDevtoolsHeight",null),[j,q]=ce(!1),[w,le]=ce(!1),S=Tt(),v=Me(),G=(U,V)=>{if(V.button!==0)return;le(!0);const W={originalHeight:(U==null?void 0:U.getBoundingClientRect().height)??0,pageY:V.pageY},H=ne=>{const O=W.pageY-ne.pageY,ee=W.originalHeight+O;_(ee),ee<70?y(!1):y(!0)},J=()=>{le(!1),document.removeEventListener("mousemove",H),document.removeEventListener("mouseUp",J)};document.addEventListener("mousemove",H),document.addEventListener("mouseup",J)};h(),Ie(()=>{q(h()??!1)}),Ie(()=>{var U,V,W;if(j()){const H=(V=(U=o())==null?void 0:U.parentElement)==null?void 0:V.style.paddingBottom,J=()=>{var O;const ne=$.getBoundingClientRect().height;(O=o())!=null&&O.parentElement&&r(ee=>(ee!=null&&ee.parentElement&&(ee.parentElement.style.paddingBottom=`${ne}px`),ee))};if(J(),typeof window<"u")return window.addEventListener("resize",J),()=>{var ne;window.removeEventListener("resize",J),(ne=o())!=null&&ne.parentElement&&typeof H=="string"&&r(O=>(O.parentElement.style.paddingBottom=H,O))}}else(W=o())!=null&&W.parentElement&&r(H=>(H!=null&&H.parentElement&&H.parentElement.removeAttribute("style"),H))}),Ie(()=>{if(o()){const U=o(),V=getComputedStyle(U).fontSize;U==null||U.style.setProperty("--tsrd-font-size",V)}});const{style:ie={},...se}=t,{style:z={},onClick:K,...ge}=n,{onClick:fe,class:de,...N}=i;if(!S())return null;const X=Y(()=>x()??500),re=Y(()=>Q(v().devtoolsPanelContainer,v().devtoolsPanelContainerVisibility(!!h()),v().devtoolsPanelContainerResizing(w),v().devtoolsPanelContainerAnimation(j(),X()+16))),Se=Y(()=>({height:`${X()}px`,...ie||{}})),pe=Y(()=>Q(v().mainCloseBtn,v().mainCloseBtnPosition(p),v().mainCloseBtnAnimation(!!h()),de));return D(Dt,{component:l,ref:r,class:"TanStackRouterDevtools",get children(){return[D(Bt.Provider,{value:{onCloseClick:K??(()=>{})},get children(){return D(vi,Ge({ref(U){var V=$;typeof V=="function"?V(U):$=U}},se,{router:a,routerState:c,className:re,style:Se,get isOpen(){return j()},setIsOpen:y,handleDragStart:U=>G($,U),shadowDOMTarget:g}))}}),(()=>{var U=mi(),V=U.firstChild,W=V.firstChild,H=W.nextSibling,J=V.nextSibling,ne=J.nextSibling;return Qe(U,Ge(N,{"aria-label":"Open TanStack Router Devtools",onClick:O=>{y(!0),fe&&fe(O)},get class(){return pe()}}),!1,!0),u(W,D($t,{})),u(H,D($t,{})),F(O=>{var ee=v().mainCloseBtnIconContainer,f=v().mainCloseBtnIconOuter,k=v().mainCloseBtnIconInner,M=v().mainCloseBtnDivider,P=v().routerLogoCloseButton;return ee!==O.e&&d(V,O.e=ee),f!==O.t&&d(W,O.t=f),k!==O.a&&d(H,O.a=k),M!==O.o&&d(J,O.o=M),P!==O.i&&d(ne,O.i=P),O},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0}),U})()]}})}export{yi as FloatingTanStackRouterDevtools,yi as default};
