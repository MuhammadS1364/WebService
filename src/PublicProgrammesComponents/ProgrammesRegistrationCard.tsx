
import { useState, useEffect, useRef } from "react";
import { SupaBaseFunction } from "../lib/SupaBase"; // Assuming this exports your Supabase client

export default function ProgrammesRegistrationCard() {
  const [viewMode, setViewMode] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Data States
  const [programmes, setProgrammes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProgram, setNewProgram] = useState({
    Program_Code: "",
    Program_Title: "",
    WingName: "",
    Date: "",
    Venue: "",
    Category: "",
    Group: "",
    IsApproved: false,
  });

  const fileInputRef = useRef(null);

  // Filters
  const [filters, setFilters] = useState({ wing: "All", category: "All", group: "All", venue: "All" });

  // Extract unique filter values dynamically from fetched data
  const uniqueWings = ["All", ...new Set(programmes.map(p => p.WingName).filter(Boolean))];
  const uniqueCategories = ["All", ...new Set(programmes.map(p => p.Category).filter(Boolean))];
  const uniqueGroups = ["All", ...new Set(programmes.map(p => p.Group).filter(Boolean))];

  // --- SUPABASE DATA FETCHING ---
  const fetchProgrammes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await SupaBaseFunction
        .from('ProgrammesBox')
        .select('*')
        .order('Date', { ascending: false });

      if (error) throw error;
      if (data) setProgrammes(data);
    } catch (error) {
      console.error("Error fetching programmes:", error.message);
      alert("Failed to load programmes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgrammes();
  }, []);

  // --- APPROVE PROGRAMME ---
  const handleApprove = async (code) => {
    try {
      const { error } = await SupaBaseFunction
        .from('ProgrammesBox')
        .update({ IsApproved: true })
        .eq('Program_Code', code);

      if (error) throw error;

      // Update local state to reflect change instantly
      setProgrammes(prev => prev.map(p => p.Program_Code === code ? { ...p, IsApproved: true } : p));
    } catch (error) {
      console.error("Error approving programme:", error.message);
      alert("Failed to approve programme.");
    }
  };

  // --- CREATE PROGRAMME ---
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await SupaBaseFunction
        .from('ProgrammesBox')
        .insert([newProgram]);

      if (error) throw error;

      alert("Programme created successfully!");
      setIsCreateModalOpen(false);
      setNewProgram({ Program_Code: "", Program_Title: "", WingName: "", Date: "", Venue: "", Category: "", Group: "", IsApproved: false });
      fetchProgrammes(); // Refresh list
    } catch (error) {
      console.error("Error creating programme:", error.message);
      alert("Failed to create programme. Make sure the Program Code is unique.");
    }
  };

  // --- EXPORT CSV ---
  const handleExport = () => {
    if (programmes.length === 0) return alert("No data to export.");

    const headers = "Program_Code,Program_Title,WingName,Date,Venue,Category,Group,IsApproved,Total_Registration\n";
    const csvRows = programmes.map(p => {
      // Wrap strings in quotes to handle commas in data
      return `"${p.Program_Code}","${p.Program_Title}","${p.WingName}","${p.Date}","${p.Venue}","${p.Category}","${p.Group}","${p.IsApproved}","${p.Total_Registration}"`;
    });

    const csvString = headers + csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'Programmes_Export.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- IMPORT CSV (Trigger File Select) ---
  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // In a real app, you would parse the CSV here (e.g., using PapaParse) 
    // and then call SupaBaseFunction.from('ProgrammesBox').insert(parsedData)
    alert(`File "${file.name}" selected. Add a CSV parser library to complete bulk upload.`);
  };

  // --- FILTER LOGIC ---
  const filteredProgrammes = programmes.filter(p => {
    const matchesSearch = (p.Program_Title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (p.Program_Code?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesWing = filters.wing === "All" || p.WingName === filters.wing;
    const matchesCategory = filters.category === "All" || p.Category === filters.category;
    const matchesGroup = filters.group === "All" || p.Group === filters.group;

    return matchesSearch && matchesWing && matchesCategory && matchesGroup;
  });

  const calendarDayProgrammes = programmes.filter(p => p.Date === selectedDate);

  return (
    <div className="page-container">
      {/* HEADER */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Programmes</h1>
          <p className="page-subtitle">Manage all educational programmes</p>
        </div>

        <div className="header-actions">
          {/* Hidden file input for importing */}
          <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />

          <button className="btn-outline" onClick={handleImportClick}>
            <span className="icon">↑</span> Import
          </button>
          <button className="btn-outline" onClick={handleExport}>
            <span className="icon">↓</span> Export Report
          </button>

          <div className="view-toggle">
            <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>☷ List</button>
            <button className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`} onClick={() => setViewMode('calendar')}>📅 Calendar</button>
          </div>

          <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            + Create Programme
          </button>
        </div>
      </header>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Create New Programme</h2>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-grid">
                <input required type="text" placeholder="Program Code (e.g. PRG-001)" value={newProgram.Program_Code} onChange={e => setNewProgram({ ...newProgram, Program_Code: e.target.value })} />
                <input required type="text" placeholder="Program Title" value={newProgram.Program_Title} onChange={e => setNewProgram({ ...newProgram, Program_Title: e.target.value })} />
                <input type="text" placeholder="Wing Name" value={newProgram.WingName} onChange={e => setNewProgram({ ...newProgram, WingName: e.target.value })} />
                <input required type="date" value={newProgram.Date} onChange={e => setNewProgram({ ...newProgram, Date: e.target.value })} />
                <input type="text" placeholder="Venue" value={newProgram.Venue} onChange={e => setNewProgram({ ...newProgram, Venue: e.target.value })} />
                <input type="text" placeholder="Category" value={newProgram.Category} onChange={e => setNewProgram({ ...newProgram, Category: e.target.value })} />
                <input type="text" placeholder="Group" value={newProgram.Group} onChange={e => setNewProgram({ ...newProgram, Group: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Programme</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' ? (
        <div className="list-view-container panel">
          <div className="filter-bar">
            <div className="search-input">
              <span>🔍</span>
              <input type="text" placeholder="Search programmes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="dropdown-filters">
              <select onChange={(e) => setFilters({ ...filters, wing: e.target.value })}>
                {uniqueWings.map(w => <option key={w} value={w}>{w === "All" ? "All Wings" : w}</option>)}
              </select>
              <select onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                {uniqueCategories.map(c => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
              </select>
              <select onChange={(e) => setFilters({ ...filters, group: e.target.value })}>
                {uniqueGroups.map(g => <option key={g} value={g}>{g === "All" ? "All Groups" : g}</option>)}
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Wing</th>
                  <th>Venue</th>
                  <th>Date</th>
                  <th>Registrations</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="8" className="empty-state">Loading...</td></tr>
                ) : filteredProgrammes.length > 0 ? (
                  filteredProgrammes.map(prog => (
                    <tr key={prog.Program_Code}>
                      <td className="fw-500">{prog.Program_Code}</td>
                      <td>{prog.Program_Title}</td>
                      <td>{prog.WingName}</td>
                      <td>{prog.Venue}</td>
                      <td>{prog.Date}</td>
                      <td>{prog.Total_Registration || 0}</td>
                      <td>
                        {prog.IsApproved ? (
                          <span className="status-badge approved">● Approved</span>
                        ) : (
                          <span className="status-badge pending">● Pending</span>
                        )}
                      </td>
                      <td>
                        {!prog.IsApproved && (
                          <button className="btn-approve" onClick={() => handleApprove(prog.Program_Code)}>
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="8" className="empty-state">No programmes found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CALENDAR VIEW (Retained from previous build) */
        <div className="calendar-layout">
          <div className="calendar-main panel">
            {/* ... (Keep the exact calendar UI code from my previous response here) ... */}
            <div className="calendar-header">
              <h2>July 2026</h2>
              {/* Note: In a production app, use a date library like date-fns to generate actual grid days based on current month */}
              <div className="cal-controls">
                <button>{"<"}</button>
                <button className="today-btn" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>Today</button>
                <button>{">"}</button>
              </div>
            </div>

            <div className="calendar-grid-large">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="day-header">{day}</div>
              ))}
              <div className="day-cell empty"></div>
              <div className="day-cell empty"></div>
              <div className="day-cell empty"></div>

              {[...Array(31)].map((_, i) => {
                const dayNum = i + 1;
                const formattedDate = `2026-07-${dayNum.toString().padStart(2, '0')}`;
                const isSelected = selectedDate === formattedDate;
                const dayHasPrograms = programmes.some(p => p.Date === formattedDate);

                return (
                  <div key={dayNum} className={`day-cell ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedDate(formattedDate)}>
                    <span className="day-num">{dayNum}</span>
                    {dayHasPrograms && <div className="program-dots"><span className="dot"></span></div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="calendar-side panel">
            <div className="side-header">
              <h3>📅 Programmes on {selectedDate}</h3>
            </div>
            <div className="side-content">
              {calendarDayProgrammes.length > 0 ? (
                calendarDayProgrammes.map(prog => (
                  <div key={prog.Program_Code} className="side-program-card">
                    <h4>{prog.Program_Title}</h4>
                    <p>{prog.Program_Code} • {prog.WingName}</p>
                    <p>📍 {prog.Venue}</p>
                    <div className="card-footer">
                      <span className={`status-badge ${prog.IsApproved ? 'approved' : 'pending'}`}>
                        {prog.IsApproved ? 'Approved' : 'Pending'}
                      </span>
                      {!prog.IsApproved && (
                        <button className="btn-approve-small" onClick={() => handleApprove(prog.Program_Code)}>
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state-side">No programmes scheduled today.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}