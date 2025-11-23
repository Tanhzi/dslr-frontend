import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import gifshot from 'gifshot';
import './qr.css';
import { useCountdown } from "../../contexts/CountdownContext";

const generateSessionId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

function Qr() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id_pay, id_frame, photos = [], finalImage, size, cut } = location.state || {};

  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth, setAuth] = useState(getAuth());
  const { id_admin } = auth || {};

  // ✅ Trạng thái cho QR ảo (chỉ hiển thị preview)
  const [previewQr, setPreviewQr] = useState(null);
  const [finalImageWithQr, setFinalImageWithQr] = useState(null);
  const [showQrOverlay, setShowQrOverlay] = useState(false);

  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [doNotSaveToWeb, setDoNotSaveToWeb] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  const { formattedCountdown, countdown } = useCountdown();

  // === Tạo QR ảo để preview (không có session thật) ===
  useEffect(() => {
    const fakeSessionId = 'preview_' + Math.random().toString(36).substr(2, 9);
    const fakeUrl = `${import.meta.env.VITE_API_BASE_URL}/download?session_id=${fakeSessionId}`;
    QRCode.toDataURL(fakeUrl, { width: 256, margin: 2 })
      .then(dataUrl => setPreviewQr(dataUrl))
      .catch(err => console.error('Lỗi tạo QR preview:', err));
  }, []);

  // === Cập nhật preview ảnh có QR khi bật toggle ===
  useEffect(() => {
    if (!finalImage || !previewQr) {
      setFinalImageWithQr(finalImage);
      return;
    }

    const drawQrOnImage = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        if (showQrOverlay) {
          const qrImg = new Image();
          qrImg.crossOrigin = 'anonymous';
          qrImg.onload = () => {
            const qrSize = Math.min(canvas.width * 0.15, 100);
            const margin = 10;
            const qrY = canvas.height - qrSize - margin;

            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = String(now.getFullYear()).slice(-2);
            const dateStr = `${day}-${month}-${year}`;

            ctx.font = `bold ${qrSize * 0.15}px Arial`;
            const textWidth = ctx.measureText(dateStr).width;
            const spacing = 15;
            const totalWidth = textWidth + spacing + qrSize;
            const startX = canvas.width - margin - totalWidth;
            const padding = 10;
            const backgroundHeight = qrSize + padding * 2;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(startX - padding, qrY - padding, totalWidth + padding * 2, backgroundHeight);

            ctx.fillStyle = '#000';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(dateStr, startX, qrY + qrSize / 2);

            ctx.drawImage(qrImg, startX + textWidth + spacing, qrY, qrSize, qrSize);
            setFinalImageWithQr(canvas.toDataURL('image/jpeg'));
          };
          qrImg.src = previewQr;
        } else {
          setFinalImageWithQr(finalImage);
        }
      };
      img.src = finalImage;
    };

    drawQrOnImage();
  }, [showQrOverlay, finalImage, previewQr]);

  // === Các hàm API (giống trước) ===

  const uploadCollection = async (filesToUpload, sessionId, downloadLink) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesToUpload,
          session_id: sessionId,
          id_admin: id_admin,
          download_link: downloadLink,
        }),
      });
      if (!response.ok) throw new Error('Upload thất bại');
    } catch (error) {
      console.error('Lỗi upload:', error);
    }
  };

  const sendQrEmail = async (email, sessionId) => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/send-qr-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, session_id: sessionId }),
      });
      setEmailSent(true);
    } catch (err) {
      console.error('Gửi email QR thất bại:', err);
    }
  };

  const sendOriginalImagesEmail = async (email, images) => {
    try {
      const sessionId = generateSessionId();
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/send-original-images-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, session_id: sessionId, images }),
      });
      setEmailSent(true);
    } catch (err) {
      console.error('Gửi ảnh gốc thất bại:', err);
    }
  };

  const updateIdFrameAndIdQr = async (id, id_frame, id_qr, email = null) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/update-pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, id_frame, id_qr, email }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Cập nhật thất bại');
      }
      return true;
    } catch (error) {
      console.error('Lỗi cập nhật DB:', error);
      alert('Cập nhật thông tin thất bại: ' + error.message);
      return false;
    }
  };

  // === Xử lý GIF (vẫn cần để upload sau) ===
  const [gifBase64, setGifBase64] = useState(null);
  const [videoConfig, setVideoConfig] = useState({ video: 0 });
  const [isGifReady, setIsGifReady] = useState(false);

  useEffect(() => {
    if (doNotSaveToWeb || !photos?.length) {
      setIsGifReady(true);
      return;
    }

    const loadConfigAndGif = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/camera?id_admin=${id_admin}`);
        const config = await res.json();
        setVideoConfig(config);

        if (config.video === 1) {
          gifshot.createGIF(
            {
              images: photos,
              interval: config.interval || 0.5,
              gifWidth: config.gifWidth || 640,
              gifHeight: config.gifHeight || 480,
            },
            (obj) => {
              if (!obj.error) setGifBase64(obj.image);
              setIsGifReady(true);
            }
          );
        } else {
          setIsGifReady(true);
        }
      } catch (err) {
        console.error('Lỗi tải cấu hình video:', err);
        setIsGifReady(true);
      }
    };

    loadConfigAndGif();
  }, [photos, id_admin, doNotSaveToWeb]);

  // === Xử lý khi nhấn "TIẾP TỤC" ===
  const handleContinue = async () => {
    if (isContinuing) return;
    setIsContinuing(true);

    const emailTrimmed = email.trim();

    try {
      let finalImageToSend = finalImage;
      let qrDataUrl = null;
      let sessionId = null;
      let downloadLink = null;

      if (!doNotSaveToWeb) {
        // Tạo session thật và QR thật
        sessionId = generateSessionId();
        downloadLink = `${import.meta.env.VITE_API_BASE_URL}/download?session_id=${sessionId}`;
        qrDataUrl = await QRCode.toDataURL(downloadLink, { width: 256, margin: 2 });

        if (showQrOverlay) {
          // Tái tạo ảnh có QR (dùng QR thật)
          finalImageToSend = await (new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);

              const qrImg = new Image();
              qrImg.crossOrigin = 'anonymous';
              qrImg.onload = () => {
                const qrSize = Math.min(canvas.width * 0.15, 100);
                const margin = 10;
                const qrY = canvas.height - qrSize - margin;

                const now = new Date();
                const day = String(now.getDate()).padStart(2, '0');
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year = String(now.getFullYear()).slice(-2);
                const dateStr = `${day}-${month}-${year}`;

                ctx.font = `bold ${qrSize * 0.15}px Arial`;
                const textWidth = ctx.measureText(dateStr).width;
                const spacing = 15;
                const totalWidth = textWidth + spacing + qrSize;
                const startX = canvas.width - margin - totalWidth;
                const padding = 10;
                const backgroundHeight = qrSize + padding * 2;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(startX - padding, qrY - padding, totalWidth + padding * 2, backgroundHeight);
                ctx.fillStyle = '#000';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(dateStr, startX, qrY + qrSize / 2);
                ctx.drawImage(qrImg, startX + textWidth + spacing, qrY, qrSize, qrSize);
                resolve(canvas.toDataURL('image/jpeg'));
              };
              qrImg.src = qrDataUrl;
            };
            img.src = finalImage;
          }));
        }
      }

      // Cập nhật DB (chờ)
      const idQrToSave = doNotSaveToWeb ? null : sessionId;
      const updateSuccess = await updateIdFrameAndIdQr(id_pay, id_frame, idQrToSave, emailTrimmed || null);
      if (!updateSuccess) {
        setIsContinuing(false);
        return;
      }

      // Chuyển trang NGAY
      navigate('/choose', {
        state: {
          compositeImage: finalImageToSend,
          qrImage: qrDataUrl,
          size,
          cut,
        },
      });

      // Chạy nền
      if (doNotSaveToWeb) {
        if (emailTrimmed) {
          sendOriginalImagesEmail(emailTrimmed, [finalImage, ...photos]);
        }
      } else {
        const filesToUpload = [
          { data: qrDataUrl, type: 'qr' },
          { data: finalImage, type: 'composite' },
          ...photos.map(data => ({ data, type: 'single' })),
        ];
        if (videoConfig?.video === 1 && gifBase64) {
          filesToUpload.push({ data: gifBase64, type: 'gif' });
        }
        uploadCollection(filesToUpload, sessionId, downloadLink);
        if (emailTrimmed) {
          sendQrEmail(emailTrimmed, sessionId);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tiếp tục:', err);
      alert('Lỗi: ' + (err.message || 'Không xác định'));
      setIsContinuing(false);
    }
  };

  // Tự động tiếp tục khi đếm ngược = 0
  useEffect(() => {
    if (countdown === 0 && !isContinuing) {
      handleContinue();
    }
  }, [countdown, isContinuing]);

  // === JSX ===
  return (
    <div className="qr-container">
      <div className="countdown">⏳: {formattedCountdown}</div>
      <h1 className="touch-to-crecuts mau_h1">TẠO MÃ QR ĐỂ TẢI XUỐNG</h1>

      <div className="qr-layout box5">
        {/* CỘT TRÁI: Ảnh preview */}
        <div className="preview-column">
          <div className="image-preview-wrapper">
            <img
              src={showQrOverlay ? finalImageWithQr || finalImage : finalImage}
              alt="Ảnh preview"
              className="preview-image-main"
            />
            {doNotSaveToWeb && (
              <div className="privacy-note">🔒 Ảnh sẽ không được lưu lên web</div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: Tùy chọn */}
        <div className="qr-column">
          <div className="privacy-toggle">
            <label className="privacy-checkbox">
              <input
                type="checkbox"
                checked={doNotSaveToWeb}
                onChange={(e) => setDoNotSaveToWeb(e.target.checked)}
              />
              <span>🔒 Không lưu ảnh lên web</span>
            </label>
          </div>

          <div className="email-section">
            {!emailSent ? (
              <>
                <label className="email-label">Nhập email để nhận ảnh:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="email-input"
                />
              </>
            ) : (
              <div className="email-success">✅ Đã gửi thông tin vào email!</div>
            )}
          </div>

          {!doNotSaveToWeb && (
            <div className="qr-toggle-wrapper">
              <label className="qr-toggle">
                <input
                  type="checkbox"
                  checked={showQrOverlay}
                  onChange={(e) => setShowQrOverlay(e.target.checked)}
                />
                <span>In QR lên ảnh</span>
              </label>
            </div>
          )}

          {!doNotSaveToWeb && previewQr && (
            <div className="qr-code-section">
              <h3 className="color">Mã QR tải ảnh</h3>
              <img
                src={previewQr}
                alt="Mã QR preview"
                className="qr-image"
              />
            </div>
          )}
        </div>
      </div>

      <div className="continue-container">
        <button
          className="continue-button"
          onClick={handleContinue}
          disabled={isContinuing || (doNotSaveToWeb ? false : !isGifReady)}
        >
          {isContinuing ? 'ĐANG XỬ LÝ...' : 'TIẾP TỤC'}
        </button>
      </div>
    </div>
  );
}

export default Qr;