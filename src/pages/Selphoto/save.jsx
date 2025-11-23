import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SelPhoto.css';

const SelPhoto = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { photos, cut, size } = location.state || { photos: [], cut: '3', size: 'default' };

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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0); // Ảnh đang được chọn để áp dụng filter
  const [appliedFilters, setAppliedFilters] = useState({}); // Lưu filter cho từng ảnh
  const [countdown, setCountdown] = useState(100);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [allSlotsFilled, setAllSlotsFilled] = useState(false);

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
      
      // Khởi tạo filter mặc định cho tất cả ảnh
      const initialFilters = {};
      filledSlots.forEach((slot, index) => {
        if (slot) {
          initialFilters[index] = 'original';
        }
      });
      setAppliedFilters(initialFilters);
    }
  }, [photos, cut]);

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

    // --- TRƯỜNG HỢP CUTS = '42' (layout 2×2, canvas 600×900) ---
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
    // --- TRƯỜNG HỢP CUTS = '41' (layout 4 ảnh theo hàng dọc, canvas 600×1800) ---
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
    // --- TRƯỜNG HỢP CUTS = '3' ---
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
    // --- TRƯỜNG HỢP CUTS = '6' (layout 2×3, canvas 1200×1800) ---
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
    // --- Fallback layout dạng lưới (nếu cut không khớp) ---
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

    // Tạo canvas với kích thước đã tính
    const canvas = document.createElement('canvas');
    canvas.width = compositeWidth;
    canvas.height = compositeHeight;
    const ctx = canvas.getContext('2d');

    // Tải toàn bộ ảnh
    const loadedImages = await Promise.all(images.map(item => loadImage(item.photo)));

    // Vẽ ảnh vào canvas với filter
    images.forEach((item, idx) => {
      const pos = positions[idx];
      const img = loadedImages[idx];
      
      // Áp dụng filter
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
      
      // Reset filter
      ctx.filter = 'none';
    });
    
    return canvas.toDataURL('image/png');
  };

  // ================== Countdown ==================
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (countdown === 0 && !autoTriggered) {
      setAutoTriggered(true);
      setTimeout(() => handleContinue(), 100);
    }
  }, [countdown, autoTriggered]);

  // ================== Check if all slots are filled ==================
  useEffect(() => {
    const areAllSlotsFilled = selectedSlots.every(slot => slot !== null);
    setAllSlotsFilled(areAllSlotsFilled);
  }, [selectedSlots]);

  // ================== Xử lý các chức năng ==================
  const handleFlipImage = (index) => {
    const updatedSlots = [...selectedSlots];
    if (updatedSlots[index]) {
      updatedSlots[index] = { ...updatedSlots[index], flip: !updatedSlots[index].flip };
      setSelectedSlots(updatedSlots);
    }
  };

  const handleRetakePhoto = (index) => {
    // Chuyển về trang Photo để chụp lại ảnh tại vị trí index
    // Truyền thêm thông tin về ảnh hiện tại để Photo.jsx có thể thay thế đúng vị trí
    navigate('/photo', { 
      state: { 
        size, 
        cut, 
        retakeIndex: index,
        currentPhotos: photos,
        selectedSlots: selectedSlots 
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
  
  const handleContinue = async () => {
    let finalSlots = [...selectedSlots];
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
      navigate('/frame', { state: { photos, compositeImage, size, cut, selectedSlots: finalSlots} });
    } catch (error) {
      console.error("Lỗi tạo ảnh tổng hợp:", error);
    }
  };

  // ================== Helper: Lấy kích thước ảnh gốc ==================
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

  // ================== Render các ô chọn ảnh với layout cải tiến ==================
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
      border: selectedImageIndex === index ? '3px solid #007bff' : '2px solid #ddd',
      borderRadius: '10px',
      boxShadow: selectedImageIndex === index 
        ? '0 4px 12px rgba(0,123,255,0.3)' 
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
              
              {/* Nút chụp lại - góc trên bên trái */}
              <button
                className="btn btn-sm btn-warning position-absolute"
                style={{
                  top: '8px',
                  left: '8px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  zIndex: 10
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetakePhoto(index);
                }}
                title="Chụp lại"
              >
                <i className="fas fa-camera"></i>
              </button>

              {/* Nút lật ảnh - góc trên bên phải */}
              <button
                className="btn btn-sm btn-info position-absolute"
                style={{
                  top: '8px',
                  right: '8px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  zIndex: 10
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFlipImage(index);
                }}
                title="Lật ảnh"
              >
                <i className="fas fa-sync-alt"></i>
              </button>

              {/* Nút reset - góc dưới bên phải */}
              <button
                className="btn btn-sm btn-secondary position-absolute"
                style={{
                  bottom: '8px',
                  right: '8px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  zIndex: 10,
                  opacity: 0.8
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetToDefault(index);
                }}
                title="Khôi phục mặc định"
              >
                <i className="fas fa-undo"></i>
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
            padding: '20px'
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
            padding: '20px'
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
            padding: '20px'
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
            padding: '20px'
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
          <div style={slotsContainerStyle}>
            {selectedSlots.map((slot, index) => renderSlotItem(slot, index))}
          </div>
        );
    }
  };

  return (
    <div className="container-fluid vh-100">
      <div className="row h-100">
        {/* Phần hiển thị ảnh bên trái - cải tiến layout */}
        <div className="col-md-7 d-flex flex-column justify-content-center align-items-center" 
             style={{ 
               backgroundColor: '#f8f9fa',
               minHeight: '100vh',
               borderRight: '1px solid #dee2e6'
             }}>
          <div className="w-100 h-100 d-flex justify-content-center align-items-center">
            {renderSlots()}
          </div>
        </div>

        {/* Phần chọn bộ lọc bên phải */}
        <div className="col-md-5 d-flex flex-column p-4" style={{ backgroundColor: '#ffffff' }}>
          <h4 className="mb-4 text-center" style={{ color: '#495057', fontWeight: '600' }}>
            Chọn bộ lọc
          </h4>
          
          {/* Hiển thị ảnh được chọn với filter preview */}
          {selectedSlots[selectedImageIndex] && (
            <div className="selected-image-preview mb-4" style={{
              border: '3px solid #007bff',
              borderRadius: '12px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              boxShadow: '0 4px 12px rgba(0,123,255,0.15)'
            }}>
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
              <p className="text-center mt-3 mb-0" style={{ 
                color: '#007bff', 
                fontWeight: '500',
                fontSize: '16px'
              }}>
                Ảnh {selectedImageIndex + 1}
              </p>
            </div>
          )}

          {/* Danh sách bộ lọc */}
          <div className="filters-list flex-grow-1" style={{ 
            maxHeight: '400px',
            overflowY: 'auto',
            paddingRight: '5px'
          }}>
            {filters.map(filter => (
              <button
                key={filter.id}
                className={`btn w-100 mb-3 ${
                  appliedFilters[selectedImageIndex] === filter.id ? 'btn-primary' : 'btn-outline-primary'
                }`}
                style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  border: '2px solid',
                  borderColor: appliedFilters[selectedImageIndex] === filter.id ? '#007bff' : '#007bff'
                }}
                onClick={() => handleApplyFilter(filter.id)}
              >
                {filter.name}
              </button>
            ))}
          </div>

          {/* Nút tiếp tục */}
          <div className="mt-4">
            <button
              className="btn btn-success w-100"
              style={{
                padding: '15px',
                fontSize: '18px',
                fontWeight: '600',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(40,167,69,0.3)',
                transition: 'all 0.2s ease'
              }}
              onClick={handleContinue}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(40,167,69,0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(40,167,69,0.3)';
              }}
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

