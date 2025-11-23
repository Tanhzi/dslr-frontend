// src/admin/Page/Setting2/Setting2.jsx
import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../../../components/Navbar';
import './Setting2.css';

const Setting2 = () => {
  const [auth] = useState(() => JSON.parse(localStorage.getItem('auth') || '{}'));
  const { id: id_admin, username: adminName } = auth || {};

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [frames, setFrames] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCut, setFilterCut] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState(null);

  // === STATE MỚI CHO CHỤP THỬ & THỬ NGHIỆM ===
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showUploadTestModal, setShowUploadTestModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  // Danh sách ảnh đã chụp (cho cut 3, 41)
  const [capturedPhotos, setCapturedPhotos] = useState([]); // mảng ảnh
  const [uploadedPhoto, setUploadedPhoto] = useState(null); // chỉ 1 ảnh

  const [finalPreview, setFinalPreview] = useState(null);
  const [isComposing, setIsComposing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Form states cho THÊM NHIỀU KHUNG
  const [frameForms, setFrameForms] = useState([
    { id_topic: '', frame: null, type: '', cuts: '', key: Date.now() }
  ]);

  // Form chỉnh sửa
  const [editFormData, setEditFormData] = useState({
    id_topic: '',
    frame: null,
    type: '',
    cuts: ''
  });

  const itemsPerPage = 10;
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // === LẤY DANH SÁCH KHUNG ẢNH ===
  const fetchFrames = async (page = 1, search = '', cut = '') => {
    if (!id_admin) return;
    setLoading(true);
    try {
      let url = `${API_URL}/frames?id_admin=${id_admin}&page=${page}&limit=${itemsPerPage}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (cut && cut !== 'all') url += `&cuts=${cut}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.status === 'success') {
        setFrames(data.data || []);
        setTotalPages(data.total_pages || 1);
        setCurrentPage(page);
      } else {
        setFrames([]);
      }
    } catch (err) {
      console.error('Lỗi fetch frames:', err);
      alert('Không tải được khung ảnh!');
      setFrames([]);
    } finally {
      setLoading(false);
    }
  };

  // === LẤY DANH SÁCH SỰ KIỆN ===
  const fetchEvents = async () => {
    if (!id_admin) return;
    try {
      const res = await fetch(`${API_URL}/events?id_admin=${id_admin}`);
      if (!res.ok) throw new Error('Không tải được sự kiện');
      const data = await res.json();
      setEvents(data.data || []);
    } catch (err) {
      console.error('Lỗi fetch events:', err);
      setEvents([]);
    }
  };

  useEffect(() => {
    if (id_admin) {
      fetchFrames(1);
      fetchEvents();
    }
  }, [id_admin]);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchFrames(1, searchTerm, filterCut);
    }, 400);
    return () => clearTimeout(delay);
  }, [searchTerm, filterCut]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchFrames(page, searchTerm, filterCut);
    }
  };

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // === MODAL THÊM NHIỀU KHUNG ===
  const openAddModal = () => {
    setFrameForms([{ id_topic: '', frame: null, type: '', cuts: '', key: Date.now() }]);
    setShowAddModal(true);
  };

  const addFrameForm = () => {
    setFrameForms(prev => [...prev, {
      id_topic: '', frame: null, type: '', cuts: '', key: Date.now()
    }]);
  };

  const removeFrameForm = (key) => {
    setFrameForms(prev => prev.filter(f => f.key !== key));
  };

  const updateFrameForm = (key, field, value) => {
    setFrameForms(prev => prev.map(f =>
      f.key === key ? { ...f, [field]: value } : f
    ));
  };

  const handleFileChangeMultiple = (key, file) => {
    setFrameForms(prev => prev.map(f =>
      f.key === key ? { ...f, frame: file } : f
    ));
  };

  // === MODAL SỬA ===
  const openEditModal = (frame) => {
    setSelectedFrame(frame);
    setEditFormData({
      id_topic: String(frame.id_topic || ''),
      frame: null,
      type: frame.type || '',
      cuts: frame.cuts || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    const hasIdTopicChanged = editFormData.id_topic !== '' && 
                              editFormData.id_topic !== String(selectedFrame.id_topic);
    const hasTypeChanged = editFormData.type !== selectedFrame.type;
    const hasCutsChanged = editFormData.cuts !== selectedFrame.cuts;
    const hasFileChanged = editFormData.frame !== null;

    if (!hasIdTopicChanged && !hasTypeChanged && !hasCutsChanged && !hasFileChanged) {
      alert('Bạn chưa thay đổi gì cả!');
      return;
    }

    const formData = new FormData();
    if (hasIdTopicChanged) formData.append('id_topic', editFormData.id_topic);
    if (hasTypeChanged) formData.append('type', editFormData.type);
    if (hasCutsChanged) formData.append('cuts', editFormData.cuts);
    if (hasFileChanged) formData.append('frame', editFormData.frame);

    try {
      const res = await fetch(`${API_URL}/frames/${selectedFrame.id}`, {
        method: 'POST',
        headers: { 'X-HTTP-Method-Override': 'PUT' },
        body: formData
      });

      const result = await res.json();
      if (res.ok && result.status === 'success') {
        alert('Cập nhật khung ảnh thành công!');
        closeModal();
        fetchFrames(currentPage, searchTerm, filterCut);
      } else {
        alert(result.message || 'Lỗi khi cập nhật!');
      }
    } catch (err) {
      alert('Lỗi kết nối mạng!');
    }
  };

  const openPreviewModal = (frame) => {
    setSelectedFrame(frame);
    setShowPreviewModal(true);
  };

  // === HÀM XỬ LÝ SỐ LƯỢNG ẢNH & KÍCH THƯỚC THEO CUT ===
  const getCutConfig = (cut) => {
    switch (cut) {
      case '3':   return { count: 3, width: 600, height: 800, canvasW: 1800, canvasH: 800 };
      case '41':  return { count: 2, width: 600, height: 1800, canvasW: 1200, canvasH: 1800 };
      case '42':
      case '6':   return { count: 1, width: 1200, height: 1800, canvasW: 1200, canvasH: 1800 };
      default:    return { count: 1, width: 1200, height: 1800, canvasW: 1200, canvasH: 1800 };
    }
  };

  // === MỞ CAMERA CHỤP THỬ ===
  const openCameraTest = async (frame) => {
    setSelectedFrame(frame);
    setCapturedPhotos([]);
    setFinalPreview(null);
    setIsComposing(false);

    const config = getCutConfig(frame.cuts);
    if (config.count > 1) {
      alert(`Vui lòng chụp ${config.count} ảnh cho khổ ${frame.cuts === '41' ? '4x6 (2 ảnh)' : '2x3 (3 ảnh)'}`);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setShowCameraModal(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 300);
    } catch (err) {
      alert("Không mở được camera. Vui lòng cấp quyền!");
    }
  };

  // === CHỤP ẢNH ===
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');

    const newPhotos = [...capturedPhotos, dataUrl];
    setCapturedPhotos(newPhotos);

    const config = getCutConfig(selectedFrame.cuts);
    if (newPhotos.length >= config.count) {
      composeFromPhotos(newPhotos);
    } else {
      alert(`Đã chụp ${newPhotos.length}/${config.count}. Chụp tiếp ảnh ${newPhotos.length + 1}...`);
    }
  };



// === UPLOAD ẢNH MẪU (CHỈ 1 ẢNH) ===
  const handleSampleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedPhoto(ev.target.result);
      const config = getCutConfig(selectedFrame.cuts);
      const photos = Array(config.count).fill(ev.target.result); // nhân bản ảnh
      composeFromPhotos(photos);
    };
    reader.readAsDataURL(file);
  };

  // === GỘP ẢNH + KHUNG (CHUẨN NHƯ CLIENT) ===
  const composeFromPhotos = async (photoList) => {
    if (!selectedFrame || photoList.length === 0) return;
    setIsComposing(true);

    const config = getCutConfig(selectedFrame.cuts);
    const canvas = document.createElement('canvas');
    canvas.width = config.canvasW;
    canvas.height = config.canvasH;
    const ctx = canvas.getContext('2d');

    // Vẽ từng ảnh vào vị trí
    for (let i = 0; i < photoList.length; i++) {
      const photoImg = new Image();
      photoImg.src = photoList[i];
      await new Promise(r => photoImg.onload = r);

      let x = 0, y = 0;
      if (selectedFrame.cuts === '3') {
        x = i * config.width;
      } else if (selectedFrame.cuts === '41') {
        x = i * config.width;
      }
      // 42 và 6: chỉ 1 ảnh full
      ctx.drawImage(photoImg, x, y, config.width, config.height);
    }

    // Vẽ khung lên trên
    const frameImg = new Image();
    frameImg.src = selectedFrame.frame;
    await new Promise(r => frameImg.onload = r);
    ctx.drawImage(frameImg, 0, 0, config.canvasW, config.canvasH);

    setFinalPreview(canvas.toDataURL('image/png'));
    setIsComposing(false);
  };
 // === ĐÓNG CAMERA ===
  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
    setCapturedPhotos([]);
    setFinalPreview(null);
  };
  // === ĐÓNG MODAL ===
  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowPreviewModal(false);
    setShowTestModal(false);
    setShowCameraModal(false);
    setShowUploadTestModal(false);
    setSelectedFrame(null);
    setCapturedPhotos([]);
    setUploadedPhoto(null);
    setFinalPreview(null);
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  };

  // === MỞ UPLOAD TEST ===
  const openUploadTest = (frame) => {
    setSelectedFrame(frame);
    setUploadedPhoto(null);
    setFinalPreview(null);
    setShowUploadTestModal(true);
  };

 
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const invalid = frameForms.some(f => !f.id_topic || !f.type || !f.cuts || !f.frame);
    if (invalid) {
      alert('Vui lòng điền đầy đủ thông tin cho tất cả các khung!');
      return;
    }

    const formData = new FormData();
    formData.append('id_admin', id_admin);
    frameForms.forEach((form, idx) => {
      formData.append(`frames[${idx}][id_topic]`, form.id_topic);
      formData.append(`frames[${idx}][type]`, form.type);
      formData.append(`frames[${idx}][cuts]`, form.cuts);
      formData.append(`frames[${idx}][frame]`, form.frame);
    });

    try {
      const res = await fetch(`${API_URL}/frames`, {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (res.ok) {
        alert(`Thêm thành công ${frameForms.length} khung ảnh!`);
        closeModal();
        fetchFrames(currentPage, searchTerm, filterCut);
      } else {
        alert(result.message || 'Lỗi server!');
      }
    } catch (err) {
      alert('Lỗi kết nối mạng!');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa khung ảnh này?\nDữ liệu sẽ mất vĩnh viễn!')) return;
    try {
      const res = await fetch(`${API_URL}/frames/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Xóa thành công!');
        fetchFrames(currentPage, searchTerm, filterCut);
      } else {
        alert('Không thể xóa!');
      }
    } catch (err) {
      alert('Lỗi kết nối!');
    }
  };

  // === TOGGLE SELECT FRAME ===
  const toggleSelectFrame = (frame) => {
    setSelectedFrame(prev => (prev?.id === frame.id ? null : frame));
  };

  const cutOptions = [
    { value: '3', label: 'Cut 3 - Khổ nhỏ' },
    { value: '41', label: 'Cut 4 - Khổ nhỏ' },
    { value: '42', label: 'Cut 4 - Khổ to' },
    { value: '6', label: 'Cut 6 - Khổ to' }
  ];

  return (
    <div className="setting2-root">
      <Navbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} id={id_admin} username={adminName} />

      <div className="setting2-scroll-container">
        <div className={`setting2-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {/* GIỮ NGUYÊN TOÀN BỘ HEADER, CONTROLS, TABLE, PAGINATION */}
           <div className="setting2-header">
            <h2 className="setting2-title">Quản lý khung ảnh</h2>
          </div>

          <div className="setting2-controls">
            <button className="btn-pink" onClick={openAddModal}>+ Thêm khung mới</button>
            <button className="btn-pink" onClick={() => selectedFrame && openCameraTest(selectedFrame)} disabled={!selectedFrame}>
              Chụp thử
            </button>
            <button className="btn-pink" onClick={() => selectedFrame && openUploadTest(selectedFrame)} disabled={!selectedFrame}>
              Thử nghiệm
            </button>

            {/* NÚT LỌC CUT - GIỐNG RATING */}
            <div className="setting2-filter-wrapper">
              <button
                className="filter-toggle-btn"
                onClick={() => document.getElementById('cut-filter-menu').classList.toggle('show')}
                title="Lọc theo loại cut"
              >
                <i className="bi bi-funnel"></i>
              </button>

              <div id="cut-filter-menu" className="filter-menu">
                <button
                  className={!filterCut ? 'active' : ''}
                  onClick={() => {
                    setFilterCut('');
                    document.getElementById('cut-filter-menu').classList.remove('show');
                  }}
                >
                  Tất cả loại cut
                </button>
                {cutOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={filterCut === opt.value ? 'active' : ''}
                    onClick={() => {
                      setFilterCut(opt.value);
                      document.getElementById('cut-filter-menu').classList.remove('show');
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="setting2-search">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Tìm theo kiểu khung hoặc chủ đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="setting2-table-wrapper">
            <table className="setting2-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Khung ảnh</th>
                  <th>Chủ đề</th>
                  <th>Loại cut</th>
                  <th>Kiểu khung</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center">Đang tải...</td></tr>
                ) : frames.length === 0 ? (
                  <tr><td colSpan="6" className="text-center">Chưa có khung ảnh nào</td></tr>
                ) : (
                  frames.map((frame, index) => (
                    <tr
                      key={frame.id}
                      onClick={() => toggleSelectFrame(frame)}
                      className={selectedFrame?.id === frame.id ? 'selected-row' : ''}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td>
                        <img
                          src={frame.frame || '/placeholder.png'}
                          alt="frame"
                          className="frame-thumb"
                        />
                      </td>
                      <td>{frame.event_name || 'Chưa có'}</td>
                      <td>{cutOptions.find(c => c.value === frame.cuts)?.label || frame.cuts}</td>
                      <td>{frame.type}</td>
                      <td className="actions" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openEditModal(frame)} className="edit-btn" title="Sửa">
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button onClick={() => handleDelete(frame.id)} className="delete-btn" title="Xóa">
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

         <div className="setting2-pagination">
            <span>
              Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {
                Math.min(currentPage * itemsPerPage, (currentPage - 1) * itemsPerPage + frames.length)
              } trên {totalPages * itemsPerPage} khung
            </span>
            <div className="pagination-buttons">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>«</button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={currentPage === i + 1 ? 'active' : ''}
                >
                  {i + 1}
                </button>
              ))}
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>»</button>
            </div>
          </div>
        </div>
      </div>

      {/* === TẤT CẢ MODAL GIỮ NGUYÊN === */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content wide" onClick={e => e.stopPropagation()}>
            <h3>Thêm nhiều khung ảnh mới</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="frames-list">
                {frameForms.map((form, idx) => (
                  <div key={form.key} className="frame-form-item">
                    <div className="form-header">
                      <span>Khung #{idx + 1}</span>
                      {frameForms.length > 1 && (
                        <button type="button" className="remove-form" onClick={() => removeFrameForm(form.key)}>
                          <i className="bi bi-x"></i>
                        </button>
                      )}
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>Chủ đề sự kiện *</label>
                        <select
                          value={form.id_topic}
                          onChange={e => updateFrameForm(form.key, 'id_topic', e.target.value)}
                          required
                        >
                          <option value="">Chọn chủ đề</option>
                          {events.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Ảnh khung *</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleFileChangeMultiple(form.key, e.target.files[0])}
                          required
                        />
                        {form.frame && <small>{form.frame.name}</small>}
                      </div>

                      <div className="form-group">
                        <label>Kiểu khung *</label>
                        <input
                          type="text"
                          value={form.type}
                          onChange={e => updateFrameForm(form.key, 'type', e.target.value)}
                          placeholder="VD: Sinh nhật, Noel..."
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Loại cut *</label>
                        <select
                          value={form.cuts}
                          onChange={e => updateFrameForm(form.key, 'cuts', e.target.value)}
                          required
                        >
                          <option value="">Chọn</option>
                          {cutOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="add-more-btn" onClick={addFrameForm}>
                Thêm khung khác
              </button>

              <div className="modal-buttons">
                <button type="button" onClick={closeModal} className="cancel">Hủy</button>
                <button type="submit" className="submit">
                  Thêm tất cả khung
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Sửa khung ảnh</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Chủ đề sự kiện *</label>
                <select
                  value={editFormData.id_topic}
                  onChange={e => setEditFormData(prev => ({ ...prev, id_topic: e.target.value }))}
                  required
                >
                  <option value="">Chọn chủ đề</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Ảnh khung (Để trống nếu không đổi)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files[0]) {
                      setEditFormData(prev => ({ ...prev, frame: e.target.files[0] }));
                    }
                  }}
                />
                {editFormData.frame && <small className="file-name">Attachment: {editFormData.frame.name}</small>}
              </div>

              <div className="form-group">
                <label>Kiểu khung *</label>
                <input
                  type="text"
                  value={editFormData.type}
                  onChange={e => setEditFormData(prev => ({ ...prev, type: e.target.value }))}
                  placeholder="VD:ที Sinh nhật, Noel..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Phân loại *</label>
                <select
                  value={editFormData.cuts}
                  onChange={e => setEditFormData(prev => ({ ...prev, cuts: e.target.value }))}
                  required
                >
                  <option value="">Chọn loại cut</option>
                  {cutOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="modal-buttons">
                <button type="button" onClick={closeModal} className="cancel">Hủy</button>
                <button type="submit" className="submit">Cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(showPreviewModal || showTestModal) && selectedFrame && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <button className="close-preview" onClick={closeModal}>×</button>
            <div className="preview-container">
              <img src={selectedFrame.frame} alt="Khung" className="preview-frame" />
              {showTestModal && (
                <img
                  src="/sample-photo.jpg"
                  alt="Ảnh mẫu"
                  className="preview-sample"
                  onError={e => e.target.style.display = 'none'}
                />
              )}
            </div>
            <p className="preview-info">
              {showTestModal ? 'Thử nghiệm khung với ảnh mẫu' : 'Chụp thử khung này'}
            </p>
          </div>
        </div>
      )}

      {/* === MODAL CHỤP THỬ === */}
      {/* === MODAL CHỤP THỬ (CẬP NHẬT GIAO DIỆN) === */}
      {showCameraModal && selectedFrame && (
        <div className="modal-overlay" onClick={closeCamera}>
          <div className="camera-test-modal wide" onClick={e => e.stopPropagation()}>
            <button className="close-preview" onClick={closeCamera}>×</button>
            <h3>Chụp thử khung: {selectedFrame.type} (Cut {selectedFrame.cuts})</h3>
            <p>Đã chụp: {capturedPhotos.length} / {getCutConfig(selectedFrame.cuts).count} ảnh</p>

            <div className="camera-container">
              <video ref={videoRef} className="camera-video" playsInline autoPlay></video>
              {capturedPhotos.length < getCutConfig(selectedFrame.cuts).count && (
                <button className="capture-btn" onClick={capturePhoto}>
                  <i className="bi bi-camera-fill"></i>
                </button>
              )}
            </div>

            {/* Hiển thị ảnh đã chụp */}
            {capturedPhotos.length > 0 && (
              <div className="captured-preview-grid">
                {capturedPhotos.map((src, i) => (
                  <img key={i} src={src} alt={`Ảnh ${i+1}`} className="captured-thumb" />
                ))}
              </div>
            )}

            {/* Kết quả cuối */}
            {isComposing && <p>Đang ghép khung...</p>}
            {finalPreview && (
              <div className="result-preview">
                <img src={finalPreview} alt="Kết quả cuối" className="final-result" />
              </div>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
          </div>
        </div>
      )}

      {/* === MODAL THỬ NGHIỆM (UPLOAD 1 ẢNH) === */}
      {showUploadTestModal && selectedFrame && (
        <div className="modal-overlay" onClick={() => setShowUploadTestModal(false)}>
          <div className="upload-test-modal wide" onClick={e => e.stopPropagation()}>
            <button className="close-preview" onClick={() => setShowUploadTestModal(false)}>×</button>
            <h3>Thử nghiệm khung: {selectedFrame.type} (Cut {selectedFrame.cuts})</h3>

            {!uploadedPhoto ? (
              <label className="upload-label">
                <input type="file" accept="image/*" onChange={handleSampleUpload} />
                <i className="bi bi-cloud-upload"></i>
                <span>Click hoặc kéo thả 1 ảnh mẫu vào đây<br/>Ảnh sẽ được nhân bản tự động theo số ô</span>
              </label>
            ) : (
              <div className="result-preview">
                {isComposing ? <p>Đang xử lý...</p> : (
                  <img src={finalPreview} alt="Kết quả" className="final-result" />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Setting2;