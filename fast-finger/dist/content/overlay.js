(function(){if(document.getElementById("ff-overlay"))return;const t=document.createElement("div");t.id="ff-overlay",t.innerHTML=`
    <div id="ff-overlay-inner">
      <div class="ff-ov-header">⌨ Fast Finger</div>
      <div class="ff-ov-row">
        <span class="ff-ov-label">Streak</span>
        <span class="ff-ov-val" id="ff-ov-streak">—</span>
      </div>
      <div class="ff-ov-row">
        <span class="ff-ov-label">Avg WPM</span>
        <span class="ff-ov-val" id="ff-ov-wpm">—</span>
      </div>
      <div class="ff-ov-row">
        <span class="ff-ov-label">Tests</span>
        <span class="ff-ov-val" id="ff-ov-tests">0</span>
      </div>
      <div class="ff-ov-row">
        <span class="ff-ov-label">Last WPM</span>
        <span class="ff-ov-val" id="ff-ov-last">—</span>
      </div>
      <div class="ff-ov-goal-row">
        <div class="ff-ov-goal-label">
          <span>WPM Goal</span>
          <span id="ff-ov-goal-pct">—</span>
        </div>
        <div class="ff-ov-goal-bar">
          <div class="ff-ov-goal-fill" id="ff-ov-goal-fill" style="width:0%"></div>
        </div>
      </div>
      <button id="ff-ov-toggle" title="Minimize">—</button>
    </div>
  `,document.body.appendChild(t);let o=!1;const i=t.querySelector("#ff-overlay-inner");t.querySelector("#ff-ov-toggle").addEventListener("click",()=>{o=!o,i.classList.toggle("ff-ov-minimized",o)});function f(){chrome.runtime.sendMessage({type:"GET_STATS",range:"daily"},e=>{e&&(document.getElementById("ff-ov-wpm").textContent=e.avgWpm||"—",document.getElementById("ff-ov-tests").textContent=e.testCount||0)}),chrome.runtime.sendMessage({type:"GET_STREAK"},e=>{e&&(document.getElementById("ff-ov-streak").textContent=`${e.count} 🔥`)}),chrome.storage.local.get(["goals","sessions"],e=>{const s=e.goals||{wpm:80},n=(e.sessions||[]).filter(a=>new Date(a.createdAt).toDateString()===new Date().toDateString());if(!n.length)return;const d=Math.round(n.reduce((a,v)=>a+(v.wpm||0),0)/n.length),l=Math.min(100,Math.round(d/s.wpm*100));document.getElementById("ff-ov-goal-pct").textContent=`${l}%`,document.getElementById("ff-ov-goal-fill").style.width=`${l}%`})}f(),window.addEventListener("ff:session-saved",e=>{const s=e.detail||{};s.wpm&&(document.getElementById("ff-ov-last").textContent=`${s.wpm} WPM`),f()})})();
