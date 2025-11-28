// src/admin/Page/Setting2/Setting2.jsx
import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../../components/Navbar';
import './FrameAD.css';

const FrameAD = () => {
  const getAuth = () => {
      const saved = localStorage.getItem('auth');
      return saved ? JSON.parse(saved) : null;
  };

  const [auth, setAuth] = useState(getAuth());
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
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showUploadTestModal, setShowUploadTestModal] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState(null);

  /// === STATE CHO CHỤP THỬ & THỬ NGHIỆM ===
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [countdown, setCountdown] = useState(5);
  const [photoIndex, setPhotoIndex] = useState(1);
  const [flash, setFlash] = useState(false);
  const [isMirror, setIsMirror] = useState(false);
  const [initialTime, setInitialTime] = useState(5);
  const [subsequentTime, setSubsequentTime] = useState(8);
  const [isStarted, setIsStarted] = useState(false);
  const [maxPhotos, setMaxPhotos] = useState(0);
  const [finalPreview, setFinalPreview] = useState(null);
  const [isComposing, setIsComposing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

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
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const API_URL1 ='http://localhost:8000';

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
        검사Frames(currentPage, searchTerm, filterCut);
      } else {
        alert(result.message || 'Lỗi khi cập nhật!');
      }
    } catch (err) {
      alert('Lỗi kết nối mạng!');
    }
  };

  const toggleSelectFrame = (frame) => {
    setSelectedFrame(prev => (prev?.id === frame.id ? null : frame));
  };

  // === CẤU HÌNH SỐ ẢNH THEO CUT ===
  const getMaxPhotos = (cutValue) => {
    const cutNum = Number(cutValue);
    if (cutNum === 3) return 3;
    if (cutNum === 41 || cutNum === 42) return 4;
    if (cutNum === 6) return 6;
    return 1;
  };

  // === MỞ CHỤP THỬ ===
  const openCameraTest = async (frame) => {
    setSelectedFrame(frame);
    const maxPhotoCount = getMaxPhotos(frame.cuts);
    setMaxPhotos(maxPhotoCount);
    setCapturedPhotos([]);
    setPhotoIndex(1);
    setIsStarted(false);
    setFinalPreview(null);
    setIsComposing(false);

    // Lấy cấu hình camera
    try {
      const res = await fetch(`${API_URL}/camera/basic?id_admin=${id_admin}`);
      const data = await res.json();
      setInitialTime(Number(data.time1) || 5);
      setSubsequentTime(Number(data.time2) || 8);
      setIsMirror(Number(data.mirror) === 1);
    } catch (err) {
      console.error('Lỗi lấy cấu hình camera:', err);
    }

    try {
      const constraints = {
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraStream(stream);
      setShowCameraModal(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setIsStarted(true);
      }, 500);
    } catch (err) {
      alert("Không mở được camera. Vui lòng cấp quyền!");
    }
  };

  // === CROP ẢNH - GIỐNG HỆT Photo.jsx ===
  const getCropDimensions = (cutValue, imgWidth, imgHeight) => {
    const cutNum = Number(cutValue);
    let targetAspectRatio;

    switch (cutNum) {
      case 3:   targetAspectRatio = 276 / 220; break;
      case 41:  targetAspectRatio = 276 / 195; break;
      case 42:  targetAspectRatio = 260 / 330; break;
      case 6:   targetAspectRatio = 280 / 240; break;
      default:  targetAspectRatio = 1;
    }

    const imgAspectRatio = imgWidth / imgHeight;
    let cropWidth, cropHeight, cropX, cropY;

    if (imgAspectRatio > targetAspectRatio) {
      cropHeight = imgHeight;
      cropWidth = Math.round(cropHeight * targetAspectRatio);
      cropX = Math.round((imgWidth - cropWidth) / 2);
      cropY = 0;
    } else {
      cropWidth = imgWidth;
      cropHeight = Math.round(cropWidth / targetAspectRatio);
      cropX = 0;
      cropY = Math.round((imgHeight - cropHeight) / 2);
    }

    return { cropWidth, cropHeight, cropX, cropY };
  };

  // === CHỤP ẢNH ===
  const handleTakePhoto = async () => {
    if (!streamRef.current || !videoRef.current) return;

    const video = videoRef.current;
    let videoWidth = video.videoWidth;
    let videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) {
      await new Promise(resolve => {
        const onLoaded = () => { videoWidth = video.videoWidth; videoHeight = video.videoHeight; resolve(); };
        video.addEventListener('loadedmetadata', onLoaded, { once: true });
        setTimeout(resolve, 500);
      });
    }

    const { cropWidth, cropHeight, cropX, cropY } = getCropDimensions(selectedFrame.cuts, videoWidth, videoHeight);
    const canvas = canvasRef.current;
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, cropWidth, cropHeight);
    ctx.save();

    if (isMirror) {
      ctx.translate(cropWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    ctx.restore();

    canvas.toBlob((blob) => {
      if (!blob) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const newPhotos = [...capturedPhotos, dataUrl];
        setCapturedPhotos(newPhotos);
        setPhotoIndex(prev => prev + 1);
        setFlash(true);
        setTimeout(() => setFlash(false), 200);

        if (newPhotos.length >= maxPhotos) {
          generateCompositeImage(newPhotos);
        }
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.92);
  };

  // === TỰ ĐỘNG CHỤP ===
  useEffect(() => {
    if (!isStarted || photoIndex > maxPhotos) return;

    const currentTime = photoIndex === 1 ? initialTime : subsequentTime;
    setCountdown(currentTime);

    const timer = setTimeout(() => {
      handleTakePhoto();
    }, currentTime * 1000);

    return () => clearTimeout(timer);
  }, [photoIndex, isStarted, maxPhotos, initialTime, subsequentTime]);

  useEffect(() => {
    if (!isStarted || photoIndex > maxPhotos) return;
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isStarted, photoIndex, maxPhotos]);

  // === GHÉP ẢNH – ĐỒNG BỘ 100% VỚI SELPHOTO & FRAME ===
  const generateCompositeImage = async (photos) => {
    if (!selectedFrame || photos.length === 0) return;
    setIsComposing(true);

    const cutValue = selectedFrame.cuts;
    let compositeWidth, compositeHeight, imageWidth, imageHeight, positions = [];

    // === ĐỒNG BỘ KÍCH THƯỚC CANVAS VỚI SELPHOTO ===
    if (cutValue === '3') {
      compositeWidth = 900; compositeHeight = 300;
      imageWidth = 276; imageHeight = 220;
      const paddingLeft = 25, paddingTop = 40, gap = 11;
      positions = [
        { x: paddingLeft, y: paddingTop },
        { x: paddingLeft + imageWidth + gap, y: paddingTop },
        { x: paddingLeft + 2 * (imageWidth + gap), y: paddingTop }
      ];
    }
    else if (cutValue === '41') {
      compositeWidth = 300; compositeHeight = 900;
      imageWidth = 276; imageHeight = 195;
      const paddingLeft = 12, paddingTop = 25, gap = 10;
      const totalGap = 3 * gap;
      const availableHeight = compositeHeight - paddingTop - 90 - totalGap;
      imageHeight = availableHeight / 4;
      for (let i = 0; i < 4; i++) {
        positions.push({ x: paddingLeft, y: paddingTop + i * (imageHeight + gap) });
      }
    }
    else if (cutValue === '42') {
      compositeWidth = 600; compositeHeight = 900;
      imageWidth = 295; imageHeight = 390;
      const paddingLeft = 5, paddingTop = 30, gap = 1;
      positions = [
        { x: paddingLeft, y: paddingTop },
        { x: paddingLeft + imageWidth + gap, y: paddingTop },
        { x: paddingLeft, y: paddingTop + imageHeight + gap },
        { x: paddingLeft + imageWidth + gap, y: paddingTop + imageHeight + gap }
      ];
    }
    else if (cutValue === '6') {
      compositeWidth = 600; compositeHeight = 900;
      imageWidth = 295; imageHeight = 240;
      const paddingLeft = 10, paddingTop = 24, gap = 1;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          const x = paddingLeft + col * (imageWidth + gap);
          const y = paddingTop + row * (imageHeight + gap);
          positions.push({ x, y });
        }
      }
    } else {
      compositeWidth = 800; compositeHeight = 600;
      const count = photos.length;
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const spacing = 10;
      imageWidth = (compositeWidth - spacing * (cols + 1)) / cols;
      imageHeight = (compositeHeight - spacing * (rows + 1)) / rows;
      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.push({ x: spacing + col * (imageWidth + spacing), y: spacing + row * (imageHeight + spacing) });
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = compositeWidth;
    canvas.height = compositeHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, compositeWidth, compositeHeight);

    // Crop & vẽ ảnh
    const processed = await Promise.all(
      photos.slice(0, positions.length).map(async (src) => {
        const img = new Image();
        img.src = src;
        await new Promise(r => img.onload = r);
        const { cropWidth, cropHeight, cropX, cropY } = getCropDimensions(cutValue, img.width, img.height);
        const temp = document.createElement('canvas');
        temp.width = cropWidth; temp.height = cropHeight;
        const tctx = temp.getContext('2d');
        tctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        return temp.toDataURL('image/jpeg', 0.92);
      })
    );

    const images = await Promise.all(processed.map(src => {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
      });
    }));

    images.forEach((img, i) => {
      const pos = positions[i];
      ctx.drawImage(img, pos.x, pos.y, imageWidth, imageHeight);
    });

    // VẼ KHUNG LÊN TRÊN CUỐI CÙNG
    const frameImg = new Image();
    frameImg.src = selectedFrame.frame;
    await new Promise(r => frameImg.onload = r);
    ctx.drawImage(frameImg, 0, 0, compositeWidth, compositeHeight);

    setFinalPreview(canvas.toDataURL('image/png'));
    setIsComposing(false);
  };

  // === UPLOAD TEST ===
  const openUploadTest = (frame) => {
    setSelectedFrame(frame);
    setFinalPreview(null);
    setShowUploadTestModal(true);
  };

  const handleSampleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const photo = ev.target.result;
      const count = getMaxPhotos(selectedFrame.cuts);
      generateCompositeImage(Array(count).fill(photo));
    };
    reader.readAsDataURL(file);
  };

  // === ĐÓNG CAMERA ===
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
    setShowCameraModal(false);
    setCapturedPhotos([]);
    setFinalPreview(null);
    setIsStarted(false);
    setPhotoIndex(1);
  };

  // === ĐÓNG MODAL ===
  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowCameraModal(false);
    setShowUploadTestModal(false);
    setSelectedFrame(null);
    setCapturedPhotos([]);
    setFinalPreview(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
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
          {/* HEADER, CONTROLS, TABLE, PAGINATION */}
          <div className="setting2-header">
            <h2 className="setting2-title">THIẾT LẬP KHUNG ẢNH</h2>
          </div>

          <div className="setting2-controls">
            <button className="btn-pink" onClick={openAddModal}><i className="bi bi-plus-lg"></i> Thêm khung mới</button>
            <button className="btn-pink" onClick={() => selectedFrame && openCameraTest(selectedFrame)} disabled={!selectedFrame}>
              Chụp thử
            </button>
            <button className="btn-pink" onClick={() => selectedFrame && openUploadTest(selectedFrame)} disabled={!selectedFrame}>
              Thử nghiệm
            </button>

            <div className="setting2-filter-wrapper">
              <button className="filter-toggle-btn" onClick={() => document.getElementById('cut-filter-menu').classList.toggle('show')}>
                <i className="bi bi-funnel"></i>
              </button>
              <div id="cut-filter-menu" className="filter-menu">
                <button className={!filterCut ? 'active' : ''} onClick={() => { setFilterCut(''); document.getElementById('cut-filter-menu').classList.remove('show'); }}>
                  Tất cả loại cut
                </button>
                {cutOptions.map(opt => (
                  <button key={opt.value} className={filterCut === opt.value ? 'active' : ''} onClick={() => { setFilterCut(opt.value); document.getElementById('cut-filter-menu').classList.remove('show'); }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="setting2-search">
            <i className="bi bi-search"></i>
            <input type="text" placeholder="Tìm theo kiểu khung hoặc chủ đề..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="setting2-table-wrapper">
            <table className="setting2-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>KHUNG ẢNH</th>
                  <th>CHỦ ĐỀ</th>
                  <th>LOẠI CUT</th>
                  <th>KIỂU KHUNG</th>
                  <th>HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center">Đang tải...</td></tr>
                ) : frames.length === 0 ? (
                  <tr><td colSpan="6" className="text-center">Chưa có khung ảnh nào</td></tr>
                ) : (
                  frames.map((frame, index) => (
                    <tr key={frame.id} onClick={() => toggleSelectFrame(frame)} className={selectedFrame?.id === frame.id ? 'selected-row' : ''} style={{ cursor: 'pointer' }}>
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
<td>
  <img 
    src={frame.frame 
      ? (frame.frame.startsWith('http') 
          ? frame.frame 
          : `${API_URL1}${frame.frame}`)
      : '/placeholder.png'} 
    alt="frame" 
    className="frame-thumb" 
    onError={(e) => {
      e.target.src = '/placeholder.png';
    }}
  />
</td>
                      <td>{frame.event_name || 'Chưa có'}</td>
                      <td>{cutOptions.find(c => c.value === frame.cuts)?.label || frame.cuts}</td>
                      <td>{frame.type}</td>
                      <td className="actions" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openEditModal(frame)} className="edit-btn" title="Sửa"><i className="bi bi-pencil"></i></button>
                        <button onClick={() => handleDelete(frame.id)} className="delete-btn" title="Xóa"><i className="bi bi-trash"></i></button>
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
                <button key={i + 1} onClick={() => handlePageChange(i + 1)} className={currentPage === i + 1 ? 'active' : ''}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>»</button>
            </div>
          </div>
        </div>
      </div>

      {/* === MODAL THÊM NHIỀU KHUNG === */}
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
                        <select value={form.id_topic} onChange={e => updateFrameForm(form.key, 'id_topic', e.target.value)} required>
                          <option value="">Chọn chủ đề</option>
                          {events.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Ảnh khung *</label>
                        <input type="file" accept="image/*" onChange={e => handleFileChangeMultiple(form.key, e.target.files[0])} required />
                        {form.frame && <small>{form.frame.name}</small>}
                      </div>
                      <div className="form-group">
                        <label>Kiểu khung *</label>
                        <input type="text" value={form.type} onChange={e => updateFrameForm(form.key, 'type', e.target.value)} placeholder="VD: Sinh nhật, Noel..." required />
                      </div>
                      <div className="form-group">
                        <label>Loại cut *</label>
                        <select value={form.cuts} onChange={e => updateFrameForm(form.key, 'cuts', e.target.value)} required>
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
              <button type="button" className="add-more-btn" onClick={addFrameForm}>Thêm khung khác</button>
              <div className="modal-buttons">
                <button type="button" onClick={closeModal} className="cancel">Hủy</button>
                <button type="submit" className="submit">Thêm tất cả khung</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === MODAL SỬA === */}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Sửa khung ảnh</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Chủ đề sự kiện *</label>
                <select value={editFormData.id_topic} onChange={e => setEditFormData(prev => ({ ...prev, id_topic: e.target.value }))} required>
                  <option value="">Chọn chủ đề</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Ảnh khung (Để trống nếu không đổi)</label>
                <input type="file" accept="image/*" onChange={e => e.target.files[0] && setEditFormData(prev => ({ ...prev, frame: e.target.files[0] }))} />
                {editFormData.frame && <small className="file-name">Attachment: {editFormData.frame.name}</small>}
              </div>
              <div className="form-group">
                <label>Kiểu khung *</label>
                <input type="text" value={editFormData.type} onChange={e => setEditFormData(prev => ({ ...prev, type: e.target.value }))} placeholder="VD: Sinh nhật, Noel..." required />
              </div>
              <div className="form-group">
                <label>Phân loại *</label>
                <select value={editFormData.cuts} onChange={e => setEditFormData(prev => ({ ...prev, cuts: e.target.value }))} required>
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

      {/* === MODAL CHỤP THỬ – FULLSCREEN, ĐÚNG TỶ LỆ === */}
      {showCameraModal && selectedFrame && (
        <div className="modal-overlay" onClick={closeCamera}>
          <div className="camera-test-modal" onClick={e => e.stopPropagation()}>
            <button className="close-preview" onClick={closeCamera}>×</button>
            <h3>Chụp thử khung: {selectedFrame.type} (Cut {selectedFrame.cuts})</h3>
            <p>Ảnh: {photoIndex - 1}/{maxPhotos}</p>

            <div className="live-view-fullscreen">
              <video ref={videoRef} className="video-stream-fullscreen" style={{ transform: isMirror ? 'scaleX(-1)' : 'none' }} playsInline muted autoPlay />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {flash && <div className="flash-overlay-fullscreen" />}
            </div>

            {isStarted && photoIndex <= maxPhotos && (
              <div className="countdown-center">
                <div className="countdown-number-large">{countdown}</div>
              </div>
            )}

            {capturedPhotos.length > 0 && (
              <div className="captured-photos-column">
                <div className="captured-photos-title">Ảnh đã chụp ({capturedPhotos.length}/{maxPhotos})</div>
                {capturedPhotos.map((src, i) => (
                  <img key={i} src={src} alt={`Ảnh ${i+1}`} className="captured-photo-item" />
                ))}
              </div>
            )}

            {finalPreview && (
              <div className="result-preview">
                {isComposing ? <p>Đang ghép khung...</p> : (
                  <img 
                    src={finalPreview} 
                    alt="Kết quả" 
                    className={`final-result ${selectedFrame.cuts === '41' ? 'cut41' : ''}`} 
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === MODAL UPLOAD TEST === */}
      {showUploadTestModal && selectedFrame && (
        <div className="modal-overlay" onClick={() => setShowUploadTestModal(false)}>
          <div className="upload-test-modal wide" onClick={e => e.stopPropagation()}>
            <button className="close-preview" onClick={() => setShowUploadTestModal(false)}>×</button>
            <h3>Thử nghiệm khung: {selectedFrame.type} (Cut {selectedFrame.cuts})</h3>
            {!finalPreview ? (
              <label className="upload-label">
                <input type="file" accept="image/*" onChange={handleSampleUpload} />
                <i className="bi bi-cloud-upload"></i>
                <span>Click hoặc kéo thả 1 ảnh mẫu vào đây<br/>Ảnh sẽ được nhân bản tự động</span>
              </label>
            ) : (
              <div className="result-preview">
                {isComposing ? <p>Đang xử lý...</p> : (
                  <img src={finalPreview} alt="Kết quả" className={`final-result ${selectedFrame.cuts === '41' ? 'cut41' : ''}`} />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FrameAD;