import React, { useState, useEffect } from 'react';
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
  }; // ← Nhận selectedFrameId

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

  // ĐÃ SỬA: TRUYỀN selectedFrameId
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
          selectedFrameId: selectedFrameId, // ← FIX: Truyền ID
          selectedFrame: selectedFrame
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
        selectedFrameId: selectedFrameId, // ← FIX: Truyền ID khi retake
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

        <div className="col-md-5 d-flex flex-column p-4" style={{ height: '100vh', overflow: 'hidden' }}>
          <h4 className="mb-4 text-center" style={{ color: '#495057', fontWeight: '600' }}>
            Chọn bộ lọc
          </h4>

          {selectedSlots[selectedImageIndex] && (
            <div className="selected-image-preview mb-4" style={{
              border: '3px solid #fda4af',
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
                color: '#fda4af',
                fontWeight: '500',
                fontSize: '16px'
              }}>
                Ảnh {selectedImageIndex + 1}
              </p>
            </div>
          )}

          <div className="filters-container mb-3" style={{ padding: '0 5px' }}>
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
                          className={`btn w-100 ${appliedFilters[selectedImageIndex] === filter.id ? 'btn-primary' : 'btn-outline-primary'
                            }`}
                          style={{
                            padding: '8px 5px',
                            fontSize: '12px',
                            fontWeight: '500',
                            borderRadius: '6px',
                            transition: 'all 0.2s ease',
                            border: '1px solid',
                            borderColor: appliedFilters[selectedImageIndex] === filter.id ? '#fda4af' : '#fda4af',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: 0
                          }}
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

//chua có thanh net