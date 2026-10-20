(() => {
 const $ = id => document.getElementById(id);
 let mode = "signin", client = null, currentUser = null, currentProfile = null;
 const config = window.HELLO_WORK_CONFIG || {};
 const configured = config.supabaseUrl && config.supabaseAnonKey && !config.supabaseUrl.includes("YOUR_") && !config.supabaseAnonKey.includes("YOUR_");
 if (configured && window.supabase) client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
 let refreshInProgress=false;
 function triggerAppRefresh(){
  if(refreshInProgress)return;
  refreshInProgress=true;
  document.body.classList.add("is-refreshing");
  const button=$("appRefreshBtn");
  if(button){button.disabled=true;button.setAttribute("aria-label","Refreshing Hello Work");button.setAttribute("aria-busy","true");}
  window.setTimeout(()=>window.location.reload(),450);
 }
 $("appRefreshBtn").addEventListener("click",triggerAppRefresh);
 // Home-screen iPhone web apps may not show Safari's normal refresh control.
 // Support a gentle pull-down refresh when the page is already at the top.
 let pullStartY=null;
 window.addEventListener("touchstart",event=>{
  if(event.touches.length!==1||window.scrollY>0)return;
  pullStartY=event.touches[0].clientY;
 },{passive:true});
 window.addEventListener("touchend",event=>{
  if(pullStartY===null)return;
  const distance=event.changedTouches[0].clientY-pullStartY;
  if(distance>95&&window.scrollY<=0&&!refreshInProgress)triggerAppRefresh();
  pullStartY=null;
 },{passive:true});
 function note(message, type="") { $("notice").textContent = message; $("notice").className = "notice " + type; }
 function setMode(next) {
  mode = next;
  $("signInTab").classList.toggle("active", mode === "signin");
  $("signUpTab").classList.toggle("active", mode === "signup");
  $("formTitle").innerHTML = mode === "signin" ? 'Make room for<br><span>great work.</span>' : 'Start with a<br><span>fresh page.</span>';
  $("formIntro").textContent = mode === "signin" ? "Sign in to your workspace and pick up right where you left off." : "Create your account to join the Hello Work workspace.";
  $("submitBtn").innerHTML = mode === "signin" ? 'Sign in <span>→</span>' : 'Create account <span>→</span>';
  $("password").autocomplete = mode === "signin" ? "current-password" : "new-password";
  $("resetBtn").classList.toggle("hidden", mode !== "signin"); note("");
 }
 function showApp(user, profile) {
  currentUser = user;
  currentProfile = profile;
  $("authPanel").classList.add("hidden");
  $("appPanel").classList.remove("hidden");
  const label = profile?.full_name || user.email?.split("@")[0] || "there";
  $("welcomeTitle").textContent = "Hi, " + label + ".";
  const isAdmin = profile?.role === "admin";
  $("sidebarNav").classList.remove("hidden");
  $("sideNote").classList.add("hidden");
  $("sidebarAdminSection").classList.toggle("hidden",!isAdmin);
  document.querySelectorAll("[data-sidebar-department]").forEach(button=>button.classList.remove("active"));
  if (!isAdmin && $("manageUsersView").classList.contains("hidden") === false) showHome();
 }
 function showHome() {
  $("dashboardHome").classList.remove("hidden");
  $("departmentView").classList.add("hidden");
  $("manageUsersView").classList.add("hidden");
  $("salesProjectsView").classList.add("hidden");
  $("projectDetailView").classList.add("hidden");
 }
 const departments = {
  sales: {
   eyebrow:"DEPARTMENT 01 · SALES", title:"Sales",
   intro:"Move opportunities forward, from the first conversation to a won job.",
   tools:[
    ["♙","Leads & contacts","Keep track of prospects, customers and key contacts."],
    ["▤","Opportunities & bids","Organize estimates, proposals, bid dates and next steps."],
    ["↻","Follow-ups","See who needs a call, email or proposal update."]
   ]
  },
  operations: {
   eyebrow:"DEPARTMENT 02 · OPERATIONS", title:"Operations",
   intro:"Keep awarded work organized from handoff through completion.",
   tools:[
    ["▦","Job board","See active jobs, status, owners and upcoming milestones."],
    ["◷","Scheduling","Coordinate crews, site dates, deliveries and deadlines."],
    ["✓","Field progress","Track scope, site updates, materials and open issues."]
   ]
  },
  finance: {
   eyebrow:"DEPARTMENT 03 · FINANCE", title:"Finance",
   intro:"Understand what each job costs, what is owed and how the business is performing.",
   tools:[
    ["$","Job profitability","Compare estimated costs, actual costs and expected margin."],
    ["▤","Invoices & receivables","Track invoices, payment status and outstanding balances."],
    ["↗","Cash flow & reporting","Get a clear view of money coming in and going out."]
   ]
  }
 };
 function showDepartment(key) {
  if(["sales","operations","finance"].includes(key)){showDepartmentProjects(key);return;}
  const dept=departments[key]; if(!dept) return;
  $("dashboardHome").classList.add("hidden");
  $("manageUsersView").classList.add("hidden");
  $("salesProjectsView").classList.add("hidden");
  $("projectDetailView").classList.add("hidden");
  $("departmentView").classList.remove("hidden");
  $("departmentEyebrow").textContent=dept.eyebrow;
  $("departmentTitle").textContent=dept.title;
  $("departmentIntro").textContent=dept.intro;
  const tools=$("departmentTools"); tools.innerHTML="";
  dept.tools.forEach(item=>{
   const card=document.createElement("article"); card.className="department-tool-card";
   const icon=document.createElement("span"); icon.className="tool-icon"; icon.textContent=item[0];
   const title=document.createElement("h3"); title.textContent=item[1];
   const description=document.createElement("p"); description.textContent=item[2];
   const status=document.createElement("span"); status.className="tool-status"; status.textContent="PLANNED";
   card.append(icon,title,description,status); tools.append(card);
  });
 }


 const projectStatuses=[{key:"lead",label:"Lead"},{key:"sale",label:"Sale"},{key:"active",label:"Active project"},{key:"complete",label:"Complete project"},{key:"lost",label:"Lost project"}];
 let salesProjects=[], projectFilter="all", projectSearchTerm="", activeDepartment="sales", activeProject=null;
 const departmentNames={sales:"Sales",operations:"Operations",finance:"Finance"};
 function showDepartmentProjects(key){
  activeDepartment=key;projectFilter="all";projectSearchTerm="";$("projectSearch").value="";
  $("dashboardHome").classList.add("hidden");$("departmentView").classList.add("hidden");$("manageUsersView").classList.add("hidden");$("projectDetailView").classList.add("hidden");$("salesProjectsView").classList.remove("hidden");
  $("salesBackBtn").textContent="← All departments";$("salesProjectsView").querySelector(".eyebrow").textContent="DEPARTMENT · "+departmentNames[key].toUpperCase();$("salesProjectsView").querySelector("h2").textContent=departmentNames[key]+" projects";$("salesProjectsView").querySelector(".sales-heading p").textContent="Shared projects assigned to "+departmentNames[key]+". Open any project to update details and checklists.";
  loadSalesProjects();
 }
 function showSalesProjects(){showDepartmentProjects("sales");}
 function projectMoney(value){return value===null||value===""||value===undefined?"":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(value));}
 function renderSalesStats(){
  const target=$("salesStats");target.innerHTML="";
  [{key:"all",label:"All projects"},...projectStatuses.map(s=>({key:s.key,label:s.label}))].forEach(s=>{const n=s.key==="all"?salesProjects.length:salesProjects.filter(p=>p.status===s.key).length;const b=document.createElement("button");b.type="button";b.className="sales-stat"+(projectFilter===s.key?" active":"");b.setAttribute("aria-pressed",String(projectFilter===s.key));const strong=document.createElement("strong");strong.textContent=String(n);const label=document.createElement("span");label.textContent=s.label;b.append(strong,label);b.addEventListener("click",()=>{projectFilter=s.key;renderSalesStats();renderProjectFilters();renderSalesProjectList();});target.append(b);});
 }
 function renderProjectFilters(){const target=$("projectFilters");target.innerHTML="";[{key:"all",label:"All"},...projectStatuses].forEach(s=>{const b=document.createElement("button");b.type="button";b.className="project-filter"+(projectFilter===s.key?" active":"");b.textContent=s.label;b.addEventListener("click",()=>{projectFilter=s.key;renderSalesStats();renderProjectFilters();renderSalesProjectList();});target.append(b);});}
 function renderSalesProjectList(){
  const target=$("salesProjectList");target.innerHTML="";const term=projectSearchTerm.trim().toLowerCase();
  const rows=salesProjects.filter(p=>(projectFilter==="all"||p.status===projectFilter)&&(!term||[p.title,p.customer_name,p.contact_email].some(v=>(v||"").toLowerCase().includes(term))));
  if(!rows.length){const box=document.createElement("div");box.className="projects-empty";const h=document.createElement("h3");h.textContent=salesProjects.length?"No matching projects":"No projects in "+departmentNames[activeDepartment]+" yet";const p=document.createElement("p");p.textContent=salesProjects.length?"Try another search or status filter.":"Create a project here, or move an existing project into this department.";box.append(h,p);const b=document.createElement("button");b.type="button";b.className="primary";b.textContent="＋ New project";b.addEventListener("click",openNewProjectForm);box.append(b);target.append(box);return;}
  rows.forEach(project=>{
   const card=document.createElement("article");card.className="sales-project-card project-card-clickable";card.tabIndex=0;card.setAttribute("role","button");card.setAttribute("aria-label","Open project "+project.title);card.addEventListener("click",()=>showProjectDetail(project));card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();showProjectDetail(project);}});
   const top=document.createElement("div");top.className="sales-project-top";const tw=document.createElement("div");tw.className="sales-project-title-wrap";const h=document.createElement("h3");h.textContent=project.title;const customer=document.createElement("p");customer.className="sales-project-customer";customer.textContent=project.customer_name||"Customer not added";tw.append(h,customer);
   const select=document.createElement("select");select.className="project-status-select status-"+project.status;select.setAttribute("aria-label","Change status for "+project.title);projectStatuses.forEach(s=>{const o=document.createElement("option");o.value=s.key;o.textContent=s.label;o.selected=s.key===project.status;select.append(o);});select.addEventListener("click",e=>e.stopPropagation());select.addEventListener("change",e=>{e.stopPropagation();updateProjectStatus(project.id,select.value);});top.append(tw,select);card.append(top);
   const details=document.createElement("div");details.className="sales-project-details";if(project.estimated_value!==null&&project.estimated_value!==""){const value=document.createElement("span");value.className="project-value";value.textContent=projectMoney(project.estimated_value);details.append(value);}if(project.contact_email){const email=document.createElement("span");email.className="project-email";email.textContent=project.contact_email;details.append(email);}const date=document.createElement("span");date.className="project-created";date.textContent="Created "+new Date(project.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});details.append(date);card.append(details);
   if(project.notes){const notes=document.createElement("p");notes.className="sales-project-notes";notes.textContent=project.notes;card.append(notes);}const open=document.createElement("span");open.className="project-open-link";open.textContent="Open project →";card.append(open);target.append(card);
  });
 }
 async function loadSalesProjects(){
  const target=$("salesProjectList");target.innerHTML='<div class="projects-loading">Loading projects…</div>';$("projectsNotice").textContent="";if(!client){target.textContent="Please sign in to load projects.";return;}
  const {data,error}=await client.from("sales_projects").select("id,title,customer_name,contact_email,estimated_value,status,notes,created_at,department,updated_at,project_number,site_address,general_contractor,scope_of_work,bid_due_date,target_start_date,target_completion_date,project_manager").eq("department",activeDepartment).order("created_at",{ascending:false});
  if(error){console.error(error);target.textContent="Could not load projects: "+error.message;return;}salesProjects=data||[];renderSalesStats();renderProjectFilters();renderSalesProjectList();
 }
 async function updateProjectStatus(id,status){$("projectsNotice").textContent="Saving status…";const department=["active","complete"].includes(status)?"operations":"sales";const {error}=await client.from("sales_projects").update({status,department,updated_at:new Date().toISOString()}).eq("id",id);if(error){$("projectsNotice").textContent="Status wasn't saved: "+error.message;await loadSalesProjects();return;}$("projectsNotice").textContent=status==="active"?"Won job moved to Operations. The same project folder is preserved.":"Project status updated.";await loadSalesProjects();}
 function openNewProjectForm(){$("newProjectForm").classList.remove("hidden");$("projectFormNotice").textContent="";$("projectTitle").focus();}
 function closeNewProjectForm(){$("newProjectForm").classList.add("hidden");$("newProjectForm").reset();$("projectFormNotice").textContent="";}
 $("newProjectBtn").addEventListener("click",openNewProjectForm);$("cancelNewProject").addEventListener("click",closeNewProjectForm);$("cancelNewProjectBottom").addEventListener("click",closeNewProjectForm);$("projectSearch").addEventListener("input",e=>{projectSearchTerm=e.target.value;renderSalesProjectList();});$("salesBackBtn").addEventListener("click",showHome);
 $("newProjectForm").addEventListener("submit",async e=>{e.preventDefault();if(!client||!currentUser)return;const title=$("projectTitle").value.trim();if(!title){$("projectFormNotice").textContent="Please enter a project name.";return;}const raw=$("projectValue").value;const record={title,customer_name:$("projectCustomer").value.trim(),contact_email:$("projectEmail").value.trim(),estimated_value:raw===""?null:Number(raw),site_address:$("projectAddress").value.trim(),general_contractor:$("projectGC").value.trim(),bid_due_date:$("projectBidDue").value||null,target_start_date:$("projectStartDate").value||null,target_completion_date:$("projectEndDate").value||null,scope_of_work:$("projectScope").value.trim(),notes:$("projectNotes").value.trim(),status:"lead",department:"sales",created_by:currentUser.id};const save=$("saveNewProject");save.disabled=true;save.textContent="Creating…";$("projectFormNotice").textContent="";const {error}=await client.from("sales_projects").insert(record);save.disabled=false;save.innerHTML='Create lead <span>→</span>';if(error){$("projectFormNotice").textContent="Could not create project: "+error.message;return;}closeNewProjectForm();projectFilter="all";projectSearchTerm="";$("projectSearch").value="";await loadSalesProjects();$("projectsNotice").textContent="Project created.";});
 function showProjectDetail(project){activeProject=project;$("dashboardHome").classList.add("hidden");$("departmentView").classList.add("hidden");$("manageUsersView").classList.add("hidden");$("salesProjectsView").classList.add("hidden");$("projectDetailView").classList.remove("hidden");$("detailSaveNotice").textContent="";$("departmentMoveNotice").textContent="";renderProjectDetail();loadChecklist();loadProjectChat();}
 function renderProjectDetail(){if(!activeProject)return;const p=activeProject;$("detailProjectTitle").textContent=p.title;$("detailProjectSubtitle").textContent=(p.project_number?"HW-"+String(p.project_number).padStart(4,"0")+" · ":"")+(p.customer_name||"Customer not added")+" · "+(departmentNames[p.department]||"Sales");$("detailStatusBadge").textContent=(projectStatuses.find(s=>s.key===p.status)||projectStatuses[0]).label;$("detailTitle").value=p.title||"";$("detailCustomer").value=p.customer_name||"";$("detailEmail").value=p.contact_email||"";$("detailValue").value=p.estimated_value??"";$("detailAddress").value=p.site_address||"";$("detailGC").value=p.general_contractor||"";$("detailBidDue").value=p.bid_due_date||"";$("detailStartDate").value=p.target_start_date||"";$("detailEndDate").value=p.target_completion_date||"";$("detailScope").value=p.scope_of_work||"";$("detailNotes").value=p.notes||"";$("projectDepartmentSelect").value=p.department||"sales";const sel=$("detailStatusSelect");sel.innerHTML="";projectStatuses.forEach(s=>{const o=document.createElement("option");o.value=s.key;o.textContent=s.label;o.selected=s.key===p.status;sel.append(o);});}
 async function loadChecklist(){const target=$("projectChecklist");target.innerHTML='<div class="projects-loading">Loading checklist…</div>';if(!activeProject||!client)return;const {data,error}=await client.from("project_checklist_items").select("id,title,is_done,position,created_at,completed_at").eq("project_id",activeProject.id).order("position",{ascending:true}).order("created_at",{ascending:true});if(error){target.textContent="Could not load checklist: "+error.message;return;}target.innerHTML="";const items=data||[];$("checklistProgress").textContent=items.filter(i=>i.is_done).length+" / "+items.length+" done";if(!items.length){const empty=document.createElement("p");empty.className="checklist-empty";empty.textContent="No checklist items yet. Add the first next step above.";target.append(empty);return;}items.forEach(item=>{const row=document.createElement("div");row.className="checklist-row"+(item.is_done?" is-done":"");const label=document.createElement("label");label.className="checklist-item-label";const check=document.createElement("input");check.type="checkbox";check.checked=item.is_done;check.addEventListener("change",()=>toggleChecklistItem(item,check.checked));const title=document.createElement("span");title.textContent=item.title;label.append(check,title);const remove=document.createElement("button");remove.type="button";remove.className="checklist-delete";remove.textContent="×";remove.setAttribute("aria-label","Delete "+item.title);remove.addEventListener("click",()=>deleteChecklistItem(item));row.append(label,remove);target.append(row);});}
 async function toggleChecklistItem(item,isDone){const {error}=await client.from("project_checklist_items").update({is_done:isDone,completed_at:isDone?new Date().toISOString():null}).eq("id",item.id);if(error){$("checklistNotice").textContent="Could not update item: "+error.message;await loadChecklist();return;}await loadChecklist();}
 async function deleteChecklistItem(item){if(!confirm("Delete this checklist item?"))return;const {error}=await client.from("project_checklist_items").delete().eq("id",item.id);if(error){$("checklistNotice").textContent="Could not delete item: "+error.message;return;}await loadChecklist();}
 $("addChecklistForm").addEventListener("submit",async e=>{e.preventDefault();if(!activeProject||!currentUser)return;const title=$("newChecklistItem").value.trim();if(!title)return;const btn=$("addChecklistBtn");btn.disabled=true;const {error}=await client.from("project_checklist_items").insert({project_id:activeProject.id,title,created_by:currentUser.id});btn.disabled=false;if(error){$("checklistNotice").textContent="Could not add item: "+error.message;return;}$("newChecklistItem").value="";$("checklistNotice").textContent="";await loadChecklist();});
 $("editProjectForm").addEventListener("submit",async e=>{e.preventDefault();if(!activeProject)return;const title=$("detailTitle").value.trim();if(!title){$("detailSaveNotice").textContent="Project name is required.";return;}const raw=$("detailValue").value;const patch={title,customer_name:$("detailCustomer").value.trim(),contact_email:$("detailEmail").value.trim(),estimated_value:raw===""?null:Number(raw),site_address:$("detailAddress").value.trim(),general_contractor:$("detailGC").value.trim(),bid_due_date:$("detailBidDue").value||null,target_start_date:$("detailStartDate").value||null,target_completion_date:$("detailEndDate").value||null,scope_of_work:$("detailScope").value.trim(),notes:$("detailNotes").value.trim(),updated_at:new Date().toISOString()};const btn=$("saveProjectDetails");btn.disabled=true;const {data,error}=await client.from("sales_projects").update(patch).eq("id",activeProject.id).select("id,title,customer_name,contact_email,estimated_value,status,notes,created_at,department,updated_at").single();btn.disabled=false;if(error){$("detailSaveNotice").textContent="Could not save project: "+error.message;return;}activeProject=data;salesProjects=salesProjects.map(p=>p.id===data.id?data:p);renderProjectDetail();$("detailSaveNotice").textContent="Project details saved."});
 $("projectDepartmentSelect").addEventListener("change",async e=>{if(!activeProject)return;const next=e.target.value;const {data,error}=await client.from("sales_projects").update({department:next,updated_at:new Date().toISOString()}).eq("id",activeProject.id).select("id,title,customer_name,contact_email,estimated_value,status,notes,created_at,department,updated_at").single();if(error){$("departmentMoveNotice").textContent="Could not move project: "+error.message;e.target.value=activeProject.department||"sales";return;}activeProject=data;salesProjects=salesProjects.filter(p=>p.id!==data.id);activeDepartment=next;renderProjectDetail();$("departmentMoveNotice").textContent="Moved to "+departmentNames[next]+". Details and checklist are unchanged."});
 $("detailStatusSelect").addEventListener("change",async e=>{if(!activeProject)return;const next=e.target.value;const department=["active","complete"].includes(next)?"operations":"sales";const {data,error}=await client.from("sales_projects").update({status:next,department,updated_at:new Date().toISOString()}).eq("id",activeProject.id).select("id,title,customer_name,contact_email,estimated_value,status,notes,created_at,department,updated_at,project_number,site_address,general_contractor,scope_of_work,bid_due_date,target_start_date,target_completion_date,project_manager").single();if(error){$("departmentMoveNotice").textContent="Could not update status: "+error.message;renderProjectDetail();return;}activeProject=data;salesProjects=salesProjects.filter(p=>p.id!==data.id);activeDepartment=department;renderProjectDetail();$("departmentMoveNotice").textContent=next==="active"?"Won job moved to Operations. Same project, details and checklist preserved.":"Project status updated.";});
 $("projectDetailBack").addEventListener("click",()=>{if(projectChatChannel&&client){client.removeChannel(projectChatChannel);projectChatChannel=null;}showDepartmentProjects(activeDepartment);});

 let chatViewFilter="all",projectChatChannel=null;
 async function loadProjectChat(){
  const target=$("projectChatMessages");if(!activeProject||!client)return;target.innerHTML='<div class="projects-loading">Loading project conversation…</div>';
  const {data,error}=await client.from("project_messages").select("id,project_id,author_id,body,is_task,task_status,assigned_to,due_date,completed_at,created_at").eq("project_id",activeProject.id).order("created_at",{ascending:true});
  if(error){target.textContent="Could not load project chat: "+error.message;return;}
  const messages=data||[];const openCount=messages.filter(m=>m.is_task&&m.task_status==="open").length;$("openTaskCount").textContent=openCount+" open";
  const ids=[...new Set(messages.map(m=>m.author_id).filter(Boolean))];let names={};
  if(ids.length){const profiles=await client.from("profiles").select("id,full_name").in("id",ids);(profiles.data||[]).forEach(p=>names[p.id]=p.full_name||"Team member");}
  target.innerHTML="";const visible=messages.filter(m=>chatViewFilter==="all"||(m.is_task&&m.task_status==="open"));
  if(!visible.length){const empty=document.createElement("div");empty.className="chat-empty";empty.textContent=chatViewFilter==="tasks"?"No open tasks. Turn a message into a task when something needs follow-up.":"No messages yet. Start the project conversation below.";target.append(empty);}
  visible.forEach(m=>{
   const card=document.createElement("article");card.className="chat-message"+(m.is_task?" chat-is-task":"")+(m.task_status==="completed"?" chat-task-completed":"");
   const head=document.createElement("div");head.className="chat-message-head";const author=document.createElement("span");author.className="chat-author";author.textContent=names[m.author_id]||(m.author_id===currentUser?.id?"You":"Team member");const time=document.createElement("time");time.className="chat-timestamp";time.dateTime=m.created_at;time.textContent=new Date(m.created_at).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});head.append(author,time);
   const body=document.createElement("div");body.className="chat-message-body";body.textContent=m.body;card.append(head,body);
   if(m.is_task){const meta=document.createElement("div");meta.className="chat-message-meta";const badge=document.createElement("span");badge.className="chat-task-badge"+(m.task_status==="completed"?" done":"");badge.textContent=m.task_status==="completed"?"✓ Task completed":"○ Open task";meta.append(badge);if(m.task_status==="open"){const complete=document.createElement("button");complete.type="button";complete.className="chat-task-complete";complete.textContent="✓ Mark complete";complete.addEventListener("click",()=>completeProjectTask(m));meta.append(complete);}card.append(meta);}
   target.append(card);
  });
  target.scrollTop=target.scrollHeight;
  if(projectChatChannel){await client.removeChannel(projectChatChannel);projectChatChannel=null;}
  projectChatChannel=client.channel("project-chat-"+activeProject.id).on("postgres_changes",{event:"*",schema:"public",table:"project_messages",filter:"project_id=eq."+activeProject.id},()=>{if(activeProject)loadProjectChat();}).subscribe();
 }
 async function completeProjectTask(message){const {error}=await client.from("project_messages").update({task_status:"completed",completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",message.id);if(error){$("projectChatNotice").textContent="Could not complete task: "+error.message;return;}$("projectChatNotice").textContent="Task marked complete.";await loadProjectChat();}
 $("chatAllBtn").addEventListener("click",()=>{chatViewFilter="all";$("chatAllBtn").classList.add("active");$("chatTasksBtn").classList.remove("active");loadProjectChat();});
 $("chatTasksBtn").addEventListener("click",()=>{chatViewFilter="tasks";$("chatTasksBtn").classList.add("active");$("chatAllBtn").classList.remove("active");loadProjectChat();});
 $("projectChatForm").addEventListener("submit",async e=>{e.preventDefault();if(!activeProject||!currentUser||!client)return;const body=$("projectChatInput").value.trim();if(!body)return;const btn=$("sendProjectMessage");btn.disabled=true;const isTask=$("projectChatIsTask").checked;const {error}=await client.from("project_messages").insert({project_id:activeProject.id,author_id:currentUser.id,body,is_task:isTask,task_status:"open"});btn.disabled=false;if(error){$("projectChatNotice").textContent="Could not send message: "+error.message;return;}$("projectChatInput").value="";$("projectChatIsTask").checked=false;$("projectChatNotice").textContent=isTask?"Message added as an open task.":"Message sent.";await loadProjectChat();});


 function showManageUsers() {
  $("dashboardHome").classList.add("hidden");
  $("departmentView").classList.add("hidden");
  $("salesProjectsView").classList.add("hidden");
  $("projectDetailView").classList.add("hidden");
  $("manageUsersView").classList.remove("hidden");
  if (currentProfile?.role === "admin") loadUsers();
 }
 async function getProfile(user) {
  if (!client) return null;
  const {data,error} = await client.from("profiles").select("id,full_name,role").eq("id",user.id).maybeSingle();
  if (error) { console.error(error); return null; }
  return data;
 }
 async function refreshSession(session) {
  if (!session?.user) {
   currentUser=null; currentProfile=null;
   $("appPanel").classList.add("hidden"); $("authPanel").classList.remove("hidden");
   $("manageUsersView").classList.add("hidden"); $("dashboardHome").classList.remove("hidden");
   $("sidebarNav").classList.add("hidden"); $("sideNote").classList.remove("hidden"); return;
  }
  showApp(session.user, await getProfile(session.user));
 }
 async function loadUsers() {
  const target=$("userTableBody"), count=$("userCount"), notice=$("usersNotice");
  target.innerHTML='<tr><td colspan="4" class="table-message">Loading registered users…</td></tr>';
  count.textContent="…"; notice.textContent="";
  const {data,error}=await client.rpc("admin_list_hello_work_users");
  if(error) {
   console.error(error);
   target.innerHTML='<tr><td colspan="4" class="table-message">Could not load users. Please check the admin database setup.</td></tr>';
   count.textContent="—"; notice.textContent=error.message || "Unable to load users."; return;
  }
  const users=data||[]; count.textContent=String(users.length); target.innerHTML="";
  users.forEach(u=>{
   const row=document.createElement("tr");
   const userCell=document.createElement("td"), userName=document.createElement("div"), userMeta=document.createElement("div");
   userName.className="table-user-name"; userName.textContent=u.full_name||"New member";
   userMeta.className="table-user-meta"; userMeta.textContent="Hello Work account";
   userCell.dataset.label="User"; userCell.append(userName,userMeta);
   const emailCell=document.createElement("td"); emailCell.className="email-cell"; emailCell.dataset.label="Email"; emailCell.textContent=u.email||"—";
   const roleCell=document.createElement("td"), role=document.createElement("span"); roleCell.dataset.label="Role"; role.className="role-chip "+(u.role==="admin"?"role-admin":""); role.textContent=u.role||"member"; roleCell.append(role);
   const joinedCell=document.createElement("td"); joinedCell.dataset.label="Joined"; joinedCell.className="date-cell";
   joinedCell.textContent=u.created_at?new Date(u.created_at).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}):"—";
   row.append(userCell,emailCell,roleCell,joinedCell); target.append(row);
  });
  if(!users.length) target.innerHTML='<tr><td colspan="4" class="table-message">No accounts have signed up yet.</td></tr>';
 }
 document.querySelectorAll("[data-sidebar-department]").forEach(button=>button.addEventListener("click",()=>{
  const key=button.dataset.sidebarDepartment; showDepartment(key);
  document.querySelectorAll("[data-sidebar-department]").forEach(item=>item.classList.toggle("active",item===button));
  closeMobileSidebar();
 }));
 $("sidebarManageUsersBtn").addEventListener("click",()=>{showManageUsers();document.querySelectorAll("[data-sidebar-department]").forEach(item=>item.classList.remove("active"));closeMobileSidebar();});
 $("brandHome").addEventListener("click",event=>{event.preventDefault();showHome();document.querySelectorAll("[data-sidebar-department]").forEach(item=>item.classList.remove("active"));closeMobileSidebar();});
 $("backToDepartments").addEventListener("click",showHome);
 $("refreshUsersBtn").addEventListener("click",loadUsers);
 $("signInTab").addEventListener("click",()=>setMode("signin"));
 $("signUpTab").addEventListener("click",()=>setMode("signup"));
 $("authForm").addEventListener("submit",async e=>{
  e.preventDefault(); note("");
  if(!client){note("Login is not connected yet. Follow SETUP.md to connect your free Supabase project, then add its public URL and key to config.js.","error");return;}
  const email=$("email").value.trim(), password=$("password").value;
  $("submitBtn").disabled=true; $("submitBtn").textContent="Please wait…";
  try {
   if(mode==="signin"){
    const {data,error}=await client.auth.signInWithPassword({email,password}); if(error) throw error;
    await refreshSession(data.session); note("");
   } else {
    const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name:email.split("@")[0]}}}); if(error) throw error;
    if(data.session) await refreshSession(data.session);
    else note("Account created. Check your email to confirm your address, then sign in.","success");
   }
  } catch(err){note(err.message||"Something went wrong. Please try again.","error");}
  finally{$("submitBtn").disabled=false;setMode(mode);}
 });
 $("resetBtn").addEventListener("click",async()=>{
  if(!client){note("Login is not connected yet. Connect Supabase first.","error");return;}
  const email=$("email").value.trim();if(!email){note("Enter your email address first.","error");return;}
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.href});
  note(error?error.message:"If an account exists for that email, a password-reset link will be sent.",error?"error":"success");
 });
 $("signOutBtn").addEventListener("click",async()=>{if(client) await client.auth.signOut();});
 if(client) client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>refreshSession(session),0);});
 if(client) client.auth.getSession().then(({data})=>refreshSession(data.session));
})();