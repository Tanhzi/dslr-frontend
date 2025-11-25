import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SelPhoto.css';
import { useCountdown } from "../../contexts/CountdownContext";

const SelPhoto = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { photos, cut, frameType, size, selectedFrameId, selectedFrame } = location.state || {
    photos: [],
    cut: '3',
    frameType: 'default',
    size: 'default'
  };

  // State cho các bộ lọc
  const filters = [
    { id: 'original', name: 'Gốc', filter: 'none' },
    { id: 'grayscale', name: 'Thanh xám', filter: 'grayscale(100%)' },
    { id: 'vibe', name: 'Vibe', filter: 'sepia(50%) saturate(150%) hue-rotate(15deg)' },
    { id: 'bright', name: 'Sáng', filter: 'brightness(120%) contrast(110%)' },
    { id: 'smooth', name: 'Mịn da', filter: 'blur(0.5px) brightness(105%) contrast(95%)' },
    { id: 'primer', name: 'Primer soda', filter: 'saturate(120%) contrast(110%) hue-rotate(10deg)' },
    { id: 'soly', name: 'Soly', filter: 'sepia(30%) saturate(130%) brightness(110%)' }
  ];

  // Khởi tạo số ô (slots) dựa theo cut
  const getInitialSlots = () => {
    if (cut === '3') return Array(3).fill(null);
    if (cut === '41') return Array(4).fill(null);
    if (cut === '42') return Array(4).fill(null);
    if (cut === '6') return Array(6).fill(null);
    return Array(4).fill(null);
  };

  const [selectedSlots, setSelectedSlots] = useState(getInitialSlots());
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [allSlotsFilled, setAllSlotsFilled] = useState(false);
  const [loading, setLoading] = useState(false);

  // State cho compare slider
  const [originalImages, setOriginalImages] = useState({});
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);

  // State cho stickers
  const [allStickers, setAllStickers] = useState([]);
  const [filteredStickers, setFilteredStickers] = useState([]);
  const [stickerTypes, setStickerTypes] = useState([]);
  const [selectedStickerType, setSelectedStickerType] = useState('all');
  const [showStickerTypeDropdown, setShowStickerTypeDropdown] = useState(false);
  const [placedStickers, setPlacedStickers] = useState([]);        // ← sticker trên canvas (bỏ dùng)
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [loadingStickers, setLoadingStickers] = useState(true);

  // State cho stickers trên preview image (chỉ dùng cái này)
  const [previewStickers, setPreviewStickers] = useState([]);
  const [selectedPreviewStickerId, setSelectedPreviewStickerId] = useState(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Tự động điền ảnh vào slots khi component mount
  useEffect(() => {
    if (photos && photos.length > 0) {
      const initialSlots = getInitialSlots();
      const filledSlots = initialSlots.map((_, index) => {
        if (index < photos.length) {
          return { photo: photos[index], flip: false };
        }
        return null;
      });
      setSelectedSlots(filledSlots);

      const initialFilters = {};
      filledSlots.forEach((slot, index) => {
        if (slot) {
          initialFilters[index] = 'original';
        }
      });
      setAppliedFilters(initialFilters);

      const initialOriginals = {};
      filledSlots.forEach((slot, index) => {
        if (slot) {
          initialOriginals[index] = slot.photo;
        }
      });
      setOriginalImages(initialOriginals);
    }
  }, [photos, cut]);

  // ✅ FIX: Fetch stickers từ API với proper error handling
    // ✅ FIX: Fetch stickers từ API với proper error handling (ĐÃ SỬA LỖI LẤY SAI id_admin)
  useEffect(() => {
    const fetchStickers = async () => {
      try {
        setLoadingStickers(true);
        
        // Lấy auth từ localStorage
        const authStr = localStorage.getItem('auth');
        console.log('[DEBUG] Auth from localStorage:', authStr);
        
        if (!authStr) {
        console.error('[ERROR] Không tìm thấy auth trong localStorage');
        setLoadingStickers(false);
        return;
        }

        let auth;
        try {
          auth = JSON.parse(authStr);
        } catch (e) {
          console.error('[ERROR] Parse auth JSON thất bại');
          setLoadingStickers(false);
          return;
        }

        // ⚠️ SỬA TẠI ĐÂY: Dùng id_admin thay vì id
        const id_admin = auth.id_admin ; // Ưu tiên id_admin nếu có, fallback về id (tránh crash)
        
        if (!id_admin) {
          console.error('[ERROR] Không tìm thấy id_admin trong auth');
          setLoadingStickers(false);
          return;
        }

        console.log('[DEBUG] Using id_admin:', id_admin);

        const url = `${API_URL}/stickers?id_admin=${id_admin}&limit=1000`;
        //                                             ↑↑↑ Đảm bảo endpoint đúng là /api/stickers
        console.log('[DEBUG] Fetching stickers from:', url);
        
        const response = await fetch(url);
        console.log('[DEBUG] Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('[DEBUG] Response data:', data);
        
        if (data.status === 'success') {
          console.log('[SUCCESS] Loaded', data.data?.length || 0, 'stickers');
          setAllStickers(data.data || []);
          setFilteredStickers(data.data || []);
          
          // Lấy danh sách các loại sticker
          const types = [...new Set((data.data || []).map(s => s.type).filter(Boolean))];
          console.log('[DEBUG] Sticker types:', types);
          setStickerTypes(types.length > 0 ? types : []);
        } else {
          console.error('[ERROR] API returned error:', data.message || 'Unknown');
          setAllStickers([]);
          setFilteredStickers([]);
        }
      } catch (error) {
        console.error('[ERROR] Lỗi tải stickers:', error);
        setAllStickers([]);
        setFilteredStickers([]);
      } finally {
        setLoadingStickers(false);
      }
    };

    fetchStickers();
  }, []);
  // Lọc stickers theo loại
  useEffect(() => {
    if (selectedStickerType === 'all') {
      setFilteredStickers(allStickers);
    } else {
      setFilteredStickers(allStickers.filter(s => s.type === selectedStickerType));
    }
  }, [selectedStickerType, allStickers]);

  // Hàm load ảnh (hỗ trợ crossOrigin)
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  };

  // Hàm tạo ảnh tổng hợp (composite image)
  const generateCompositeImage = async (images, cutValue) => {
    let compositeWidth, compositeHeight, positions, imageWidth, imageHeight;

    if (cutValue === '42') {
      compositeWidth = 600;
      compositeHeight = 900;

      const paddingLeft = 5;
      const paddingTop = 30;
      const paddingRight = 5;
      const paddingBottom = 120;
      const gap = 1;

      imageWidth = (compositeWidth - paddingLeft - paddingRight - gap) / 2;
      imageHeight = (compositeHeight - paddingTop - paddingBottom - gap) / 2;

      positions = [
        { x: paddingLeft, y: paddingTop },
        { x: paddingLeft + imageWidth + gap, y: paddingTop },
        { x: paddingLeft, y: paddingTop + imageHeight + gap },
        { x: paddingLeft + imageWidth + gap, y: paddingTop + imageHeight + gap }
      ];
      positions = positions.slice(0, images.length);
    }
    else if (cutValue === '41') {
      compositeWidth = 300;
      compositeHeight = 900;

      const paddingLeft = 12;
      const paddingTop = 25;
      const paddingRight = 12;
      const paddingBottom = 90;
      const gap = 10;

      imageWidth = compositeWidth - paddingLeft - paddingRight;
      imageHeight = (compositeHeight - paddingTop - paddingBottom - 3 * gap) / 4;

      positions = [];
      for (let i = 0; i < 4; i++) {
        positions.push({ x: paddingLeft, y: paddingTop + i * (imageHeight + gap) });
      }
      positions = positions.slice(0, images.length);
    }
    else if (cutValue === '3') {
      compositeWidth = 900;
      compositeHeight = 300;

      const paddingLeft = 25;
      const paddingTop = 40;
      const paddingRight = 25;
      const paddingBottom = 40;
      const gap = 11;

      imageWidth = 276;
      imageHeight = 220;

      positions = [
        { x: paddingLeft, y: paddingTop },
        { x: paddingLeft + imageWidth + gap, y: paddingTop },
        { x: paddingLeft + 2 * (imageWidth + gap), y: paddingTop }
      ];
      positions = positions.slice(0, images.length);
    }
    else if (cutValue === '6') {
      compositeWidth = 600;
      compositeHeight = 900;

      const paddingLeft = 10;
      const paddingRight = 20;
      const paddingTop = 24;
      const paddingBottom = 120;
      const gap = 1;

      imageWidth = (compositeWidth - paddingLeft - paddingRight - gap) / 2;
      imageHeight = (compositeHeight - paddingTop - paddingBottom - 2 * gap) / 3;

      positions = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          const x = paddingLeft + col * (imageWidth + gap);
          const y = paddingTop + row * (imageHeight + gap);
          positions.push({ x, y });
        }
      }
      positions = positions.slice(0, images.length);
    }
    else {
      compositeWidth = 800;
      compositeHeight = 600;
      const count = images.length;
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const spacing = 10;
      imageWidth = (compositeWidth - spacing * (cols + 1)) / cols;
      imageHeight = (compositeHeight - spacing * (rows + 1)) / rows;
      positions = [];
      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = spacing + col * (imageWidth + spacing);
        const y = spacing + row * (imageHeight + spacing);
        positions.push({ x, y });
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = compositeWidth;
    canvas.height = compositeHeight;
    const ctx = canvas.getContext('2d');

    const loadedImages = await Promise.all(images.map(item => loadImage(item.photo)));

    images.forEach((item, idx) => {
      const pos = positions[idx];
      const img = loadedImages[idx];

      const filterValue = filters.find(f => f.id === appliedFilters[idx])?.filter || 'none';
      ctx.filter = filterValue;

      if (item.flip) {
        ctx.save();
        ctx.translate(pos.x + imageWidth, pos.y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
        ctx.restore();
      } else {
        ctx.drawImage(img, pos.x, pos.y, imageWidth, imageHeight);
      }

      ctx.filter = 'none';
    });

    return canvas.toDataURL('image/png');
  };

  const { formattedCountdown } = useCountdown();
  const { countdown } = useCountdown();

  const navigateToFrame = async (finalSlotsOverride = null) => {
    let finalSlots = finalSlotsOverride || [...selectedSlots];

    if (finalSlots.some(slot => slot === null)) {
      const used = new Set(finalSlots.filter(Boolean).map(item => item.photo));
      for (let i = 0; i < finalSlots.length; i++) {
        if (!finalSlots[i]) {
          const photoToUse = photos.find(photo => !used.has(photo));
          if (photoToUse) {
            finalSlots[i] = { photo: photoToUse, flip: false };
            used.add(photoToUse);
          }
        }
      }
    }

    try {
      const compositeImage = await generateCompositeImage(finalSlots, cut);
      navigate('/frame', {
        state: {
          photos,
          compositeImage,
          frameType: location.state?.frameType,
          size,
          cut,
          selectedSlots: finalSlots,
          selectedFrameId: selectedFrameId,
          selectedFrame: selectedFrame,
          placedStickers: placedStickers
        }
      });
    } catch (error) {
      console.error("Lỗi tạo ảnh tổng hợp:", error);
    }
  };

  const handleContinue = () => {
    navigateToFrame();
  };

  useEffect(() => {
    if (countdown === 0) {
      navigateToFrame();
    }
  }, [countdown, navigate, selectedSlots, photos, cut, frameType, size]);

  useEffect(() => {
    const areAllSlotsFilled = selectedSlots.every(slot => slot !== null);
    setAllSlotsFilled(areAllSlotsFilled);
  }, [selectedSlots]);

  const handleFlipImage = (index) => {
    const updatedSlots = [...selectedSlots];
    if (updatedSlots[index]) {
      updatedSlots[index] = { ...updatedSlots[index], flip: !updatedSlots[index].flip };
      setSelectedSlots(updatedSlots);
    }
  };

  const handleRetakePhoto = (index) => {
    navigate('/photo', {
      state: {
        size,
        cut,
        retakeIndex: index,
        currentPhotos: photos,
        selectedSlots: selectedSlots,
        selectedFrameId: selectedFrameId,
        selectedFrame: selectedFrame
      }
    });
  };

  const handleApplyFilter = (filterId) => {
    setAppliedFilters(prev => ({
      ...prev,
      [selectedImageIndex]: filterId
    }));
  };

  const handleResetToDefault = (index) => {
    setAppliedFilters(prev => ({
      ...prev,
      [index]: 'original'
    }));
  };

  const handleEnhanceImage = async (index) => {
    const slot = selectedSlots[index];
    if (!slot) return;

    setLoading(true);

    try {
      let blob;
      let mimeString;

      if (slot.photo.startsWith('data:')) {
        const parts = slot.photo.split(',');
        mimeString = parts[0].split(':')[1].split(';')[0];
        const base64 = parts[1];
        const byteString = atob(base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        blob = new Blob([ab], { type: mimeString });
      } else {
        const response = await fetch(slot.photo);
        blob = await response.blob();
        mimeString = response.headers.get('content-type') || 'image/jpeg';
      }

      const ext = mimeString === 'image/jpeg' ? '.jpg' : '.png';
      const filename = `photo_${index}${ext}`;
      const file = new File([blob], filename, { type: mimeString });

      const formData = new FormData();
      formData.append('image', file);

      console.log('[DEBUG] Sending image to LOCAL AI server...');

      const res = await fetch('http://localhost:5000/enhance', {
        method: 'POST',
        body: formData,
      });

      console.log('[DEBUG] Response status:', res.status);

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[ERROR] Non-JSON response from AI server:', text.substring(0, 500));
        throw new Error('Server AI trả về lỗi: ' + (text.substring(0, 200) || 'Không xác định'));
      }

      const data = await res.json();
      console.log('[DEBUG] AI server response:', data);

      if (res.ok && data.success) {
        if (!originalImages[index]) {
          setOriginalImages(prev => ({
            ...prev,
            [index]: slot.photo
          }));
        }

        const updated = [...selectedSlots];
        updated[index] = {
          ...updated[index],
          photo: data.enhanced_image
        };
        setSelectedSlots(updated);
        
        setAppliedFilters(prev => ({ ...prev, [index]: 'original' }));
        
        setSliderPosition(50);
        
        console.log('[SUCCESS] Image enhanced successfully');
        alert('✅ Ảnh đã được làm nét!');
        
      } else {
        throw new Error(data.error || data.message || 'Làm nét thất bại');
      }
      
    } catch (err) {
      console.error('[ERROR] Enhance failed:', err);
      alert('❌ Lỗi làm nét ảnh: ' + (err.message || 'Không xác định'));
    } finally {
      setLoading(false);
    }
  };

  // Xử lý kéo slider
  const handleSliderMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleSliderMouseMove = (e) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleSliderMouseUp = () => {
    setIsDragging(false);
  };

  const handleSliderTouchStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleSliderTouchMove = (e) => {
    if (!isDragging || !sliderRef.current) return;

    const touch = e.touches[0];
    const rect = sliderRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleSliderTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleSliderMouseMove);
      document.addEventListener('mouseup', handleSliderMouseUp);
      document.addEventListener('touchmove', handleSliderTouchMove);
      document.addEventListener('touchend', handleSliderTouchEnd);
    } else {
      document.removeEventListener('mousemove', handleSliderMouseMove);
      document.removeEventListener('mouseup', handleSliderMouseUp);
      document.removeEventListener('touchmove', handleSliderTouchMove);
      document.removeEventListener('touchend', handleSliderTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleSliderMouseMove);
      document.removeEventListener('mouseup', handleSliderMouseUp);
      document.removeEventListener('touchmove', handleSliderTouchMove);
      document.removeEventListener('touchend', handleSliderTouchEnd);
    };
  }, [isDragging]);

 

  // ✅ CHỈ THÊM STICKER VÀO PREVIEW (không thêm vào canvas nữa)
  const handleAddStickerToPreview = (sticker) => {
    const newSticker = {
      id: Date.now() + Math.random(), // đảm bảo id duy nhất
      src: sticker.sticker,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0
    };
    setPreviewStickers(prev => [...prev, newSticker]);
    setSelectedPreviewStickerId(newSticker.id);
  };

  // ✅ CHỈ GỌI handleAddStickerToPreview khi click sticker
  const handleStickerClick = (sticker) => {
    handleAddStickerToPreview(sticker);
  };

  // Xử lý di chuyển sticker
  

  // ✅ NEW: Xử lý di chuyển sticker trên preview
  const handlePreviewStickerDragStart = (e, stickerId) => {
    e.preventDefault();
    setSelectedPreviewStickerId(stickerId);
    
    const previewContainer = e.currentTarget.closest('.selected-image-preview');
    if (!previewContainer) return;
    
    const rect = previewContainer.getBoundingClientRect();
    const startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    
    const sticker = previewStickers.find(s => s.id === stickerId);
    const startStickerX = sticker.x;
    const startStickerY = sticker.y;

    const handleMove = (moveEvent) => {
      const currentX = moveEvent.type.includes('mouse') ? moveEvent.clientX : moveEvent.touches[0].clientX;
      const currentY = moveEvent.type.includes('mouse') ? moveEvent.clientY : moveEvent.touches[0].clientY;
      
      const deltaX = ((currentX - startX) / rect.width) * 100;
      const deltaY = ((currentY - startY) / rect.height) * 100;

      setPreviewStickers(prev => prev.map(s =>
        s.id === stickerId
          ? { ...s, x: startStickerX + deltaX, y: startStickerY + deltaY }
          : s
      ));
    };

    const handleEnd = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  };



  // ✅ NEW: Xử lý phóng to/thu nhỏ sticker trên preview
  const handlePreviewStickerScale = (stickerId, delta) => {
    setPreviewStickers(prev => prev.map(s =>
      s.id === stickerId
        ? { ...s, scale: Math.max(0.3, Math.min(3, s.scale + delta)) }
        : s
    ));
  };

 

  // ✅ NEW: Xử lý xoay sticker trên preview
  const handlePreviewStickerRotate = (stickerId, delta) => {
    setPreviewStickers(prev => prev.map(s =>
      s.id === stickerId
        ? { ...s, rotation: (s.rotation + delta) % 360 }
        : s
    ));
  };



  // ✅ NEW: Xử lý xóa sticker trên preview
  const handleDeletePreviewSticker = (stickerId) => {
    setPreviewStickers(prev => prev.filter(s => s.id !== stickerId));
    if (selectedPreviewStickerId === stickerId) {
      setSelectedPreviewStickerId(null);
    }
  };

  const getOriginalDimensions = (cutValue) => {
    if (cutValue === '41') {
      return { width: 276, height: 195 };
    } else if (cutValue === '42') {
      return { width: 260, height: 330 };
    } else if (cutValue === '6') {
      return { width: 280, height: 240 };
    } else if (cutValue === '3') {
      return { width: 276, height: 220 };
    }
    return { width: 270, height: 370 };
  };

  const renderSlotItem = (slot, index) => {
    let slotWidth, slotHeight;
    switch (cut) {
      case '3':
        slotWidth = '200px';
        slotHeight = '160px';
        break;
      case '41':
        slotWidth = '160px';
        slotHeight = '115px';
        break;
      case '42':
        slotWidth = '180px';
        slotHeight = '230px';
        break;
      case '6':
        slotWidth = '160px';
        slotHeight = '135px';
        break;
      default:
        slotWidth = '150px';
        slotHeight = '150px';
    }

    const thumbSlotStyle = {
      width: slotWidth,
      height: slotHeight,
      position: 'relative',
      overflow: 'hidden',
      margin: '6px',
      border: selectedImageIndex === index ? '3px solid #fda4af' : '2px solid #ddd',
      borderRadius: '10px',
      boxShadow: selectedImageIndex === index
        ? '0 4px 12px rgba(250, 162, 253, 0.3)'
        : '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      backgroundColor: '#fff'
    };

    const currentFilter = appliedFilters[index] ?
      filters.find(f => f.id === appliedFilters[index])?.filter : 'none';

    return (
      <div className="slot-container" key={index}>
        <div
          className="slot"
          style={thumbSlotStyle}
          onClick={() => setSelectedImageIndex(index)}
        >
          {slot ? (
            <div className="position-relative" style={{ width: '100%', height: '100%' }}>
              <img
                src={slot.photo}
                alt={`Slot ${index}`}
                className="img-thumbnail"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: slot.flip ? 'scaleX(-1)' : 'none',
                  filter: currentFilter,
                  borderRadius: '8px'
                }}
              />

              <button
                className="btn btn-sm btn-warning position-absolute d-flex align-items-center justify-content-center p-0"
                style={{
                  top: '8px',
                  left: '8px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  zIndex: 10,
                  overflow: 'hidden'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetakePhoto(index);
                }}
                title="Chụp lại"
              >
                <img
                  src="icon-camera.png"
                  alt="Chụp lại"
                  style={{
                    width: '18px',
                    height: '18px',
                    objectFit: 'contain'
                  }}
                />
              </button>

              <button
                className="btn btn-sm btn-info position-absolute d-flex align-items-center justify-content-center p-0"
                style={{
                  top: '8px',
                  right: '8px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  zIndex: 10,
                  overflow: 'hidden'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFlipImage(index);
                }}
                title="Lật ảnh"
              >
                <img
                  src="icon-flip.png"
                  alt="Lật ảnh"
                  style={{
                    width: '18px',
                    height: '18px',
                    objectFit: 'contain'
                  }}
                />
              </button>

              <button
                className="btn btn-sm btn-secondary position-absolute d-flex align-items-center justify-content-center p-0"
                style={{
                  bottom: '8px',
                  right: '8px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  zIndex: 10,
                  overflow: 'hidden'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetToDefault(index);
                }}
                title="Khôi phục ảnh gốc"
              >
                <img
                  src="icon-review.png"
                  alt="Khôi phục"
                  style={{
                    width: '18px',
                    height: '18px',
                    objectFit: 'contain'
                  }}
                />
              </button>

              <button
                className="btn btn-sm position-absolute d-flex align-items-center justify-content-center p-0"
                style={{
                  bottom: '8px',
                  left: '8px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#fda4af',
                  border: 'none',
                  color: 'white',
                  fontSize: '16px',
                  zIndex: 10,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEnhanceImage(index);
                }}
                title="Làm nét ảnh"
                disabled={loading}
              >
                {loading ? '⏳' : '✨'}
              </button>
            </div>
          ) : (
            <div
              className="placeholder-slot"
              style={{
                ...thumbSlotStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa',
                color: '#6c757d',
                fontSize: '14px',
                border: '2px dashed #ddd'
              }}
            >
              Chọn ảnh
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSlots = () => {
    const slotsContainerStyle = {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '15px',
      justifyContent: 'center',
      alignItems: 'flex-start',
      height: '100%',
      padding: '20px',
      overflowY: 'auto'
    };

    switch (cut) {
      case '3':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '15px',
            width: '100%',
            height: '100%',
            padding: '20px',
            position: 'relative'
          }}>
            {selectedSlots.map((slot, index) => renderSlotItem(slot, index))}
            {/* ĐÃ XÓA renderPlacedStickers() */}
          </div>
        );
      case '41':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            height: '100%',
            padding: '20px',
            position: 'relative'
          }}>
            {selectedSlots.map((slot, index) => renderSlotItem(slot, index))}
           
          </div>
        );
      case '42':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '15px',
            width: '100%',
            height: '100%',
            padding: '20px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', gap: '15px' }}>
              {selectedSlots.slice(0, 2).map((slot, index) => renderSlotItem(slot, index))}
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              {selectedSlots.slice(2, 4).map((slot, index) => renderSlotItem(slot, index + 2))}
            </div>
           
          </div>
        );
      case '6':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            height: '100%',
            padding: '20px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              {selectedSlots.slice(0, 2).map((slot, index) => renderSlotItem(slot, index))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {selectedSlots.slice(2, 4).map((slot, index) => renderSlotItem(slot, index + 2))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {selectedSlots.slice(4, 6).map((slot, index) => renderSlotItem(slot, index + 4))}
            </div>
            
          </div>
        );
      default:
        return (
          <div style={{ ...slotsContainerStyle, position: 'relative' }}>
            {selectedSlots.map((slot, index) => renderSlotItem(slot, index))}
          </div>
        
        );
    }
  };

 
 

  // ✅ NEW: Render stickers đã đặt trên preview image
  const renderPreviewStickers = () => {
    return (
      <>
        {previewStickers.map(sticker => (
          <div
            key={sticker.id}
            className={`placed-sticker ${selectedPreviewStickerId === sticker.id ? 'selected' : ''}`}
            style={{
              position: 'absolute',
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
              cursor: 'move',
              zIndex: selectedPreviewStickerId === sticker.id ? 1000 : 100,
              transition: selectedPreviewStickerId === sticker.id ? 'none' : 'all 0.2s ease'
            }}
            onMouseDown={(e) => handlePreviewStickerDragStart(e, sticker.id)}
            onTouchStart={(e) => handlePreviewStickerDragStart(e, sticker.id)}
          >
            <img
              src={sticker.src}
              alt="Sticker"
              style={{
                width: '60px',
                height: '60px',
                objectFit: 'contain',
                pointerEvents: 'none'
              }}
            />
            {selectedPreviewStickerId === sticker.id && (
              <div className="sticker-controls">
                <button
                  className="sticker-control-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewStickerScale(sticker.id, 0.1);
                  }}
                  title="Phóng to"
                >
                  +
                </button>
                <button
                  className="sticker-control-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewStickerScale(sticker.id, -0.1);
                  }}
                  title="Thu nhỏ"
                >
                  -
                </button>
                <button
                  className="sticker-control-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewStickerRotate(sticker.id, 15);
                  }}
                  title="Xoay phải"
                >
                  ↻
                </button>
                <button
                  className="sticker-control-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewStickerRotate(sticker.id, -15);
                  }}
                  title="Xoay trái"
                >
                  ↺
                </button>
                <button
                  className="sticker-control-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePreviewSticker(sticker.id);
                  }}
                  title="Xóa"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ))}
      </>
    );
  };

  const hasEnhancedImage = originalImages[selectedImageIndex] &&
    selectedSlots[selectedImageIndex]?.photo !== originalImages[selectedImageIndex];

  return (
    <div className="vh-100">
      <div className="countdown">
        ⌛: {formattedCountdown}
      </div>
      <div className="row h-100">
        <div className="col-md-7 d-flex flex-column justify-content-center align-items-center"
          style={{
            backgroundColor: 'transparent',
            minHeight: '100vh',
            borderRight: '1px solid #dee2e6'
          }}>
          <div className="w-100 h-100 d-flex justify-content-center align-items-center">
            {renderSlots()}
          </div>
        </div>

        <div className="col-md-5 d-flex flex-column p-4" style={{ height: '100vh', overflow: 'auto' }}>
          <h4 className="mb-4 text-center">
            Chọn bộ lọc
          </h4>

          {selectedSlots[selectedImageIndex] && (
            <div className="selected-image-preview" style={{ position: 'relative' }}>
              {hasEnhancedImage ? (
                <div
                  ref={sliderRef}
                  className="compare-slider-container"
                  onMouseDown={handleSliderMouseDown}
                  onTouchStart={handleSliderTouchStart}
                  style={{ position: 'relative' }}
                >
                  <img
                    src={originalImages[selectedImageIndex]}
                    alt="Original"
                    style={{
                      width: '100%',
                      maxHeight: '220px',
                      objectFit: 'contain',
                      display: 'block',
                      filter: filters.find(f => f.id === appliedFilters[selectedImageIndex])?.filter || 'none',
                      transform: selectedSlots[selectedImageIndex].flip ? 'scaleX(-1)' : 'none'
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                      transition: isDragging ? 'none' : 'clip-path 0.1s ease'
                    }}
                  >
                    <img
                      src={selectedSlots[selectedImageIndex].photo}
                      alt="Enhanced"
                      style={{
                        width: '100%',
                        maxHeight: '220px',
                        objectFit: 'contain',
                        display: 'block',
                        filter: filters.find(f => f.id === appliedFilters[selectedImageIndex])?.filter || 'none',
                        transform: selectedSlots[selectedImageIndex].flip ? 'scaleX(-1)' : 'none'
                      }}
                    />
                  </div>

                  <div
                    className="compare-slider-divider"
                    style={{
                      left: `${sliderPosition}%`
                    }}
                  >
                    <div className="compare-slider-handle">
                      <div className="compare-slider-arrows">
                        <div className="compare-slider-arrow-left" />
                        <div className="compare-slider-arrow-right" />
                      </div>
                    </div>
                  </div>

                  <div className="compare-label compare-label-original">
                    GỐC
                  </div>
                  <div className="compare-label compare-label-enhanced">
                    ĐÃ LÀM NÉT
                  </div>
                  
                  {renderPreviewStickers()}
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <img
                    src={selectedSlots[selectedImageIndex].photo}
                    alt="Preview"
                    style={{
                      width: '100%',
                      maxHeight: '220px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      filter: filters.find(f => f.id === appliedFilters[selectedImageIndex])?.filter || 'none',
                      transform: selectedSlots[selectedImageIndex].flip ? 'scaleX(-1)' : 'none'
                    }}
                  />
                  {renderPreviewStickers()}
                </div>
              )}

              <p className="text-center mt-3 mb-0" style={{
                color: '#ec4899',
                fontWeight: '500',
                fontSize: '16px'
              }}>
                Ảnh {selectedImageIndex + 1}
                {hasEnhancedImage && (
                  <span style={{ fontSize: '12px', marginLeft: '8px', color: '#ec4899' }}>
                    (Kéo thanh để so sánh)
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="filters-container mb-3">
            {Array.from({ length: Math.ceil(filters.length / 3) }).map((_, rowIndex) => {
              const startIndex = rowIndex * 3;
              const rowFilters = filters.slice(startIndex, startIndex + 3);
              const displayFilters = [...rowFilters, ...Array(3 - rowFilters.length).fill(null)];

              return (
                <div key={rowIndex} className="d-flex justify-content-between mb-2" style={{ gap: '10px' }}>
                  {displayFilters.map((filter, colIndex) =>
                    <div key={filter?.id || `empty-${colIndex}`} style={{ flex: 1, minWidth: 0 }}>
                      {filter ? (
                        <button
                          className={`btn w-100 ${appliedFilters[selectedImageIndex] === filter.id ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => handleApplyFilter(filter.id)}
                        >
                          <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {filter.name}
                          </span>
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* PHẦN CHỌN STICKER */}
          <div className="sticker-section mt-4">
            <div className="sticker-header">
              <h4 className="mb-3 text-center">Chọn sticker</h4>
              <div className="sticker-type-filter">
                <button
                  className="sticker-filter-toggle"
                  onClick={() => setShowStickerTypeDropdown(!showStickerTypeDropdown)}
                >
                  {selectedStickerType === 'all' ? 'Tất cả' : selectedStickerType}
                  <span className={`dropdown-arrow ${showStickerTypeDropdown ? 'open' : ''}`}>▼</span>
                </button>
                {showStickerTypeDropdown && (
                  <div className="sticker-type-dropdown">
                    <button
                      className={selectedStickerType === 'all' ? 'active' : ''}
                      onClick={() => {
                        setSelectedStickerType('all');
                        setShowStickerTypeDropdown(false);
                      }}
                    >
                      Tất cả
                    </button>
                    {stickerTypes.map(type => (
                      <button
                        key={type}
                        className={selectedStickerType === type ? 'active' : ''}
                        onClick={() => {
                          setSelectedStickerType(type);
                          setShowStickerTypeDropdown(false);
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sticker-grid">
            {loadingStickers ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Đang tải...</span>
                </div>
              </div>
            ) : filteredStickers.length === 0 ? (
              <div className="text-center py-4 text-muted">
                Không có sticker nào
              </div>
            ) : (
              filteredStickers.map(sticker => (
                <div
                  key={sticker.id}
                  className="sticker-item"
                  onClick={() => handleStickerClick(sticker)}   // ← chỉ thêm vào preview
                >
                  <img src={sticker.sticker} alt={sticker.type} />
                </div>
              ))
            )}
          </div>
          </div>

          <div className="mt-4">
            <button
              className="btn btn-success w-100"
              onClick={handleContinue}
            >
              Tiếp tục
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelPhoto;

//file chạy hiện tại cũ