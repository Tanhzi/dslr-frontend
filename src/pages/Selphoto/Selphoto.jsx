import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SelPhoto.css';
import { useCountdown } from "../../contexts/CountdownContext";
import FilterSection from './components/FilterSection';
import StickerSection from './components/StickerSection';
import ImagePreview from './components/ImagePreview';
import Chatbot from '../../components/Chatbot';

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
  const [allSlotsFilled, setAllSlotsFilled] = useState(false);
  const [loading, setLoading] = useState(false);

  // State cho original images (để compare)
  const [originalImages, setOriginalImages] = useState({});

  // State cho stickers
  const [allStickers, setAllStickers] = useState([]);
  const [filteredStickers, setFilteredStickers] = useState([]);
  const [stickerTypes, setStickerTypes] = useState([]);
  const [selectedStickerType, setSelectedStickerType] = useState('all');
  const [showStickerTypeDropdown, setShowStickerTypeDropdown] = useState(false);
  const [loadingStickers, setLoadingStickers] = useState(true);

  // State cho stickers trên preview image (MỖI ẢNH CÓ STICKERS RIÊNG)
  const [imageStickers, setImageStickers] = useState({});
  const [selectedPreviewStickerId, setSelectedPreviewStickerId] = useState(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    // ✅ Áp dụng background từ localStorage nếu có
useEffect(() => {
  const savedBackground = localStorage.getItem('backgroundImage');
  if (savedBackground) {
    document.body.style.backgroundImage = `url(${savedBackground})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
  }

  // Cleanup khi rời khỏi trang
  return () => {
    document.body.style.backgroundImage = 'none';
  };
}, []);

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

      // Khởi tạo imageStickers cho mỗi ảnh
      const initialImageStickers = {};
      filledSlots.forEach((slot, index) => {
        if (slot) {
          initialImageStickers[index] = [];
        }
      });
      setImageStickers(initialImageStickers);
    }
  }, [photos, cut]);

  // Fetch stickers từ API với proper error handling
  useEffect(() => {
    const fetchStickers = async () => {
      try {
        setLoadingStickers(true);
        
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

        const id_admin = auth.id_admin;
        
        if (!id_admin) {
          console.error('[ERROR] Không tìm thấy id_admin trong auth');
          setLoadingStickers(false);
          return;
        }

        console.log('[DEBUG] Using id_admin:', id_admin);

        const url = `${API_URL}/stickers?id_admin=${id_admin}&limit=1000`;
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

  // Hàm tạo ảnh tổng hợp (composite image) - THÊM STICKERS
  const generateCompositeImage = async (images, cutValue) => {
    let compositeWidth, compositeHeight, positions, imageWidth, imageHeight;

    if (cutValue === '42') {
      compositeWidth = 600;
      compositeHeight = 900;
      const paddingLeft = 5;
      const paddingTop = 30;
      const paddingRight = 5;
      const paddingBottom = 125;
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
      const paddingTop = 20;
      const paddingRight = 12;
      const paddingBottom = 85;
      const gap = 5;
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

    // Vẽ ảnh + filter
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

    // VẼ STICKERS LÊN TỪNG ẢNH - CHỈ VẼ STICKER HỢP LỆ TRONG VÙNG ẢNH
    for (let idx = 0; idx < images.length; idx++) {
      const pos = positions[idx];
      const stickers = imageStickers[idx] || [];

      for (const sticker of stickers) {
        // Chỉ vẽ sticker nếu nó nằm trong vùng ảnh hợp lệ (5-95%)
        if (sticker.x >= 5 && sticker.x <= 95 && sticker.y >= 5 && sticker.y <= 95) {
          try {
            const stickerImg = await loadImage(sticker.src);
            
            ctx.save();
            
            // Tính toán vị trí thực tế trên canvas
            const stickerX = pos.x + (sticker.x / 100) * imageWidth;
            const stickerY = pos.y + (sticker.y / 100) * imageHeight;
            
            ctx.translate(stickerX, stickerY);
            ctx.rotate((sticker.rotation * Math.PI) / 180);
            ctx.scale(sticker.scale, sticker.scale);
            
            const stickerSize = 60; // Kích thước sticker cơ bản
            ctx.drawImage(
              stickerImg,
              -stickerSize / 2,
              -stickerSize / 2,
              stickerSize,
              stickerSize
            );
            
            ctx.restore();
          } catch (error) {
            console.error('[ERROR] Failed to load sticker:', sticker.src, error);
          }
        } else {
          console.log('[WARNING] Sticker outside valid area, skipping:', sticker);
        }
      }
    }

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
      navigate('/Frame', {
        state: {
          photos,
          compositeImage,
          frameType: location.state?.frameType,
          size,
          cut,
          selectedSlots: finalSlots,
          selectedFrameId: selectedFrameId,
          selectedFrame: selectedFrame,
          imageStickers: imageStickers // TRUYỀN STICKERS THEO TỪNG ẢNH
        }
      });
    } catch (error) {
      console.error("Lỗi tạo ảnh tổng hợp:", error);
    }
  };

  const handleContinue = () => {
    // Validate tất cả stickers trước khi tiếp tục
    const cleanedStickers = {};
    Object.keys(imageStickers).forEach(imgIndex => {
      const stickers = imageStickers[imgIndex] || [];
      cleanedStickers[imgIndex] = stickers.filter(s => 
        s.x >= 5 && s.x <= 95 && s.y >= 5 && s.y <= 95
      );
    });
    
    // Cập nhật state với stickers đã clean
    setImageStickers(cleanedStickers);
    
    // Đợi một chút để state cập nhật
    setTimeout(() => {
      navigateToFrame();
    }, 100);
  };

  useEffect(() => {
    if (countdown === 0) {
      // Validate tất cả stickers trước khi auto navigate
      const cleanedStickers = {};
      Object.keys(imageStickers).forEach(imgIndex => {
        const stickers = imageStickers[imgIndex] || [];
        cleanedStickers[imgIndex] = stickers.filter(s => 
          s.x >= 5 && s.x <= 95 && s.y >= 5 && s.y <= 95
        );
      });
      
      setImageStickers(cleanedStickers);
      
      setTimeout(() => {
        navigateToFrame();
      }, 100);
    }
  }, [countdown]);

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

  // THÊM STICKER VÀO ẢNH HIỆN TẠI - ĐẶT Ở GIỮA ẢNH + VALIDATE STICKER CŨ
  const handleAddStickerToPreview = (sticker) => {
    // Validate sticker cũ trước khi thêm sticker mới
    if (selectedPreviewStickerId) {
      validateAndCleanSticker(selectedPreviewStickerId);
    }
    
    const newSticker = {
      id: Date.now() + Math.random(),
      src: sticker.sticker,
      x: 50, // Đặt ở giữa ảnh
      y: 50, // Đặt ở giữa ảnh
      scale: 1,
      rotation: 0
    };
    
    setImageStickers(prev => ({
      ...prev,
      [selectedImageIndex]: [...(prev[selectedImageIndex] || []), newSticker]
    }));
    
    setSelectedPreviewStickerId(newSticker.id);
  };

  const handleStickerClick = (sticker) => {
    // Validate và xóa tất cả stickers không hợp lệ trước khi thêm mới
    const currentStickers = imageStickers[selectedImageIndex] || [];
    const validStickers = currentStickers.filter(s => 
      s.x >= 5 && s.x <= 95 && s.y >= 5 && s.y <= 95
    );
    
    if (validStickers.length < currentStickers.length) {
      console.log('[INFO] Removing', currentStickers.length - validStickers.length, 'invalid stickers before adding new one');
      setImageStickers(prev => ({
        ...prev,
        [selectedImageIndex]: validStickers
      }));
    }
    
    // Sau đó mới thêm sticker mới
    setTimeout(() => {
      handleAddStickerToPreview(sticker);
    }, 50);
  };

  // XỬ LÝ DI CHUYỂN STICKER - VALIDATE REAL-TIME, XÓA NGAY KHI RA NGOÀI
  const handlePreviewStickerDragStart = (e, stickerId) => {
    e.preventDefault();
    
    const previewContainer = e.currentTarget.closest('.selected-image-preview');
    if (!previewContainer) return;
    
    // Tìm ảnh trong preview container
    let imageElement = previewContainer.querySelector('img[alt="Preview"]');
    if (!imageElement) {
      imageElement = previewContainer.querySelector('img[alt="Enhanced"]');
    }
    if (!imageElement) {
      imageElement = previewContainer.querySelector('img');
    }
    if (!imageElement) return;
    
    const imageRect = imageElement.getBoundingClientRect();
    
    const sticker = (imageStickers[selectedImageIndex] || []).find(s => s.id === stickerId);
    if (!sticker) return;
    
    // Lưu vùng ảnh hợp lệ với margin 5%
    const margin = 0.05; // 5%
    const validImageRect = {
      left: imageRect.left + (imageRect.width * margin),
      right: imageRect.right - (imageRect.width * margin),
      top: imageRect.top + (imageRect.height * margin),
      bottom: imageRect.bottom - (imageRect.height * margin),
      width: imageRect.width * (1 - 2 * margin),
      height: imageRect.height * (1 - 2 * margin),
      originalLeft: imageRect.left,
      originalTop: imageRect.top,
      originalWidth: imageRect.width,
      originalHeight: imageRect.height
    };

    let lastValidX = sticker.x;
    let lastValidY = sticker.y;
    let isOutside = false;

    const handleMove = (moveEvent) => {
      const currentX = moveEvent.type.includes('mouse') ? moveEvent.clientX : moveEvent.touches[0].clientX;
      const currentY = moveEvent.type.includes('mouse') ? moveEvent.clientY : moveEvent.touches[0].clientY;
      
      // Kiểm tra xem con trỏ có nằm trong vùng hợp lệ không (5-95%)
      const isInsideValidArea = currentX >= validImageRect.left && 
                                currentX <= validImageRect.right && 
                                currentY >= validImageRect.top && 
                                currentY <= validImageRect.bottom;
      
      if (isInsideValidArea) {
        isOutside = false;
        
        // Tính toán vị trí tương đối so với toàn bộ ảnh
        const relativeX = currentX - validImageRect.originalLeft;
        const relativeY = currentY - validImageRect.originalTop;
        
        // Chuyển đổi sang phần trăm
        const percentX = (relativeX / validImageRect.originalWidth) * 100;
        const percentY = (relativeY / validImageRect.originalHeight) * 100;
        
        // Giới hạn trong khoảng 5-95%
        const clampedX = Math.max(5, Math.min(95, percentX));
        const clampedY = Math.max(5, Math.min(95, percentY));

        lastValidX = clampedX;
        lastValidY = clampedY;

        setImageStickers(prev => ({
          ...prev,
          [selectedImageIndex]: (prev[selectedImageIndex] || []).map(s =>
            s.id === stickerId
              ? { ...s, x: clampedX, y: clampedY }
              : s
          )
        }));
      } else {
        // Nếu ra ngoài vùng hợp lệ, đánh dấu là outside
        isOutside = true;
      }
    };

    const handleEnd = (endEvent) => {
      // Kiểm tra vị trí cuối cùng
      if (isOutside) {
        // XÓA NGAY nếu thả ngoài vùng hợp lệ
        console.log('[INFO] Sticker dragged outside valid area - removing immediately');
        setImageStickers(prev => ({
          ...prev,
          [selectedImageIndex]: (prev[selectedImageIndex] || []).filter(s => s.id !== stickerId)
        }));
        setSelectedPreviewStickerId(null);
      } else {
        // Validate vị trí cuối cùng
        const finalSticker = (imageStickers[selectedImageIndex] || []).find(s => s.id === stickerId);
        if (finalSticker) {
          if (finalSticker.x < 5 || finalSticker.x > 95 || finalSticker.y < 5 || finalSticker.y > 95) {
            console.log('[INFO] Sticker final position invalid - removing');
            setImageStickers(prev => ({
              ...prev,
              [selectedImageIndex]: (prev[selectedImageIndex] || []).filter(s => s.id !== stickerId)
            }));
            setSelectedPreviewStickerId(null);
          }
        }
      }
      
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

  // PHÓNG TO/THU NHỎ STICKER
  const handlePreviewStickerScale = (stickerId, delta) => {
    setImageStickers(prev => ({
      ...prev,
      [selectedImageIndex]: (prev[selectedImageIndex] || []).map(s =>
        s.id === stickerId
          ? { ...s, scale: Math.max(0.3, Math.min(3, s.scale + delta)) }
          : s
      )
    }));
  };

  // XOAY STICKER
  const handlePreviewStickerRotate = (stickerId, delta) => {
    setImageStickers(prev => ({
      ...prev,
      [selectedImageIndex]: (prev[selectedImageIndex] || []).map(s =>
        s.id === stickerId
          ? { ...s, rotation: (s.rotation + delta) % 360 }
          : s
      )
    }));
  };

  // XÓA STICKER
  const handleDeletePreviewSticker = (stickerId) => {
    setImageStickers(prev => ({
      ...prev,
      [selectedImageIndex]: (prev[selectedImageIndex] || []).filter(s => s.id !== stickerId)
    }));
    
    if (selectedPreviewStickerId === stickerId) {
      setSelectedPreviewStickerId(null);
    }
  };

  // Thêm useEffect để validate real-time khi imageStickers thay đổi
  useEffect(() => {
    // Kiểm tra và xóa stickers không hợp lệ ngay lập tức
    const currentStickers = imageStickers[selectedImageIndex] || [];
    const invalidStickers = currentStickers.filter(s => 
      s.x < 5 || s.x > 95 || s.y < 5 || s.y > 95
    );
    
    if (invalidStickers.length > 0) {
      console.log('[REAL-TIME VALIDATE] Found', invalidStickers.length, 'invalid stickers - removing now');
      const validStickers = currentStickers.filter(s => 
        s.x >= 5 && s.x <= 95 && s.y >= 5 && s.y <= 95
      );
      
      setImageStickers(prev => ({
        ...prev,
        [selectedImageIndex]: validStickers
      }));
      
      // Nếu sticker đang chọn bị xóa, deselect
      if (selectedPreviewStickerId && invalidStickers.some(s => s.id === selectedPreviewStickerId)) {
        setSelectedPreviewStickerId(null);
      }
    }
  }, [imageStickers, selectedImageIndex]);

  // Thêm useEffect để validate khi chuyển ảnh
  useEffect(() => {
    // Validate sticker cũ khi chuyển sang ảnh khác
    if (selectedPreviewStickerId) {
      const prevImageStickers = Object.keys(imageStickers);
      prevImageStickers.forEach(imgIndex => {
        const imgIdx = parseInt(imgIndex);
        if (imgIdx !== selectedImageIndex) {
          const stickers = imageStickers[imgIdx] || [];
          const invalidStickers = stickers.filter(s => 
            s.x < 5 || s.x > 95 || s.y < 5 || s.y > 95
          );
          
          if (invalidStickers.length > 0) {
            console.log('[INFO] Cleaning invalid stickers from image', imgIdx);
            setImageStickers(prev => ({
              ...prev,
              [imgIdx]: stickers.filter(s => 
                s.x >= 5 && s.x <= 95 && s.y >= 5 && s.y <= 95
              )
            }));
          }
        }
      });
      
      // Reset selection khi chuyển ảnh
      setSelectedPreviewStickerId(null);
    }
  }, [selectedImageIndex]);

  // XÁC NHẬN STICKER - ẨN CÁC NÚT ĐIỀU KHIỂN + VALIDATE
  const handleStickerConfirm = () => {
    // Validate sticker hiện tại trước khi deselect
    if (selectedPreviewStickerId) {
      validateAndCleanSticker(selectedPreviewStickerId);
    }
    setSelectedPreviewStickerId(null);
  };

  // VALIDATE VÀ XÓA STICKER KHÔNG HỢP LỆ
  const validateAndCleanSticker = (stickerId) => {
    const sticker = (imageStickers[selectedImageIndex] || []).find(s => s.id === stickerId);
    if (sticker) {
      // Kiểm tra vị trí hợp lệ (5-95%)
      if (sticker.x < 5 || sticker.x > 95 || sticker.y < 5 || sticker.y > 95) {
        console.log('[INFO] Removing invalid sticker at position:', sticker.x, sticker.y);
        setImageStickers(prev => ({
          ...prev,
          [selectedImageIndex]: (prev[selectedImageIndex] || []).filter(s => s.id !== stickerId)
        }));
      }
    }
  };

  const handleStickerSelect = (stickerId) => {
    // Validate sticker cũ trước khi chọn sticker mới
    if (selectedPreviewStickerId && selectedPreviewStickerId !== stickerId) {
      validateAndCleanSticker(selectedPreviewStickerId);
    }
    setSelectedPreviewStickerId(stickerId);
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

    // Hiển thị sticker trên thumbnail
    const thumbStickers = imageStickers[index] || [];

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

              {/* Hiển thị stickers trên thumbnail - CHỈ STICKER HỢP LỆ TRONG VÙNG ẢNH */}
              {thumbStickers
                .filter(sticker => 
                  sticker.x >= 5 && sticker.x <= 95 && 
                  sticker.y >= 5 && sticker.y <= 95
                )
                .map(sticker => (
                  <img
                    key={sticker.id}
                    src={sticker.src}
                    alt="Sticker"
                    style={{
                      position: 'absolute',
                      left: `${sticker.x}%`,
                      top: `${sticker.y}%`,
                      transform: `translate(-50%, -50%) scale(${sticker.scale * 0.4}) rotate(${sticker.rotation}deg)`,
                      width: '60px',
                      height: '60px',
                      objectFit: 'contain',
                      pointerEvents: 'none',
                      zIndex: 3
                    }}
                  />
                ))}

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
          <div style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            gap: '15px',
            justifyContent: 'center',
            alignItems: 'flex-start',
            height: '100%',
            padding: '20px',
            overflowY: 'auto',
            position: 'relative' 
          }}>
            {selectedSlots.map((slot, index) => renderSlotItem(slot, index))}
          </div>
        );
    }
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

        <div className="col-md-5 d-flex flex-column p-4 box-right" style={{ height: '100vh', overflow: 'auto' }}>
          <h4 className="mb-4 text-center">
            Chọn bộ lọc
          </h4>

          <ImagePreview
            selectedSlot={selectedSlots[selectedImageIndex]}
            selectedImageIndex={selectedImageIndex}
            hasEnhancedImage={hasEnhancedImage}
            originalImage={originalImages[selectedImageIndex]}
            filters={filters}
            appliedFilters={appliedFilters}
            previewStickers={imageStickers[selectedImageIndex] || []}
            selectedPreviewStickerId={selectedPreviewStickerId}
            onStickerDragStart={handlePreviewStickerDragStart}
            onStickerScale={handlePreviewStickerScale}
            onStickerRotate={handlePreviewStickerRotate}
            onStickerDelete={handleDeletePreviewSticker}
            onStickerSelect={handleStickerSelect}
            onStickerConfirm={handleStickerConfirm}
          />

          <FilterSection
            filters={filters}
            appliedFilters={appliedFilters}
            selectedImageIndex={selectedImageIndex}
            onApplyFilter={handleApplyFilter}
          />

          <StickerSection
            filteredStickers={filteredStickers}
            loadingStickers={loadingStickers}
            stickerTypes={stickerTypes}
            selectedStickerType={selectedStickerType}
            showStickerTypeDropdown={showStickerTypeDropdown}
            onStickerClick={handleStickerClick}
            onStickerTypeChange={(type) => {
              setSelectedStickerType(type);
              setShowStickerTypeDropdown(false);
            }}
            onToggleDropdown={() => setShowStickerTypeDropdown(!showStickerTypeDropdown)}
          />

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
      <Chatbot />
    </div>
  );
};

export default SelPhoto;