import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import './Download.css';

const Download = () => {
  const navigate = useNavigate();

  //countdown
  // State cho countdown và chuyển trang tự động
  const [countdown, setCountdown] = useState(100);
  const [autoTriggered, setAutoTriggered] = useState(false);

    // Giảm countdown mỗi giây
    useEffect(() => {
      if (countdown <= 0) return;
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }, [countdown]);
    
    // Khi countdown về 0, tự động gọi handleFinish
    useEffect(() => {
      if (countdown === 0 && !autoTriggered) {
        setAutoTriggered(true);
        handleFinish();
      }
    }, [countdown, autoTriggered]);

    const handleFinish = () => {
      navigate('/Appclien');
    };

  // Chatbot state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Feedback state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [ratings, setRatings] = useState({
    quality: 0,
    smoothness: 0,
    photo: 0,
    service: 0
  });
  const [comment, setComment] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');

  const stores = [
    { name: "SweetLens Quận 1", address: "123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM" },
    { name: "SweetLens Quận 7", address: "456 Đường Nguyễn Thị Thập, Phường Tân Phú, Quận 7, TP.HCM" },
    { name: "SweetLens Đà Nẵng", address: "789 Đường Bạch Đằng, Quận Hải Châu, Đà Nẵng" }
  ];

  // ✅ Tự động mở feedback khi vào trang
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFeedbackOpen(true);
    }, 300); // delay nhẹ để tránh conflict với render
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    };
  }, []);

  // === Chatbot logic (giữ nguyên) ===
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    const userMsg = { role: 'user', content: inputMessage };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputMessage }),
      });
      const data = await response.json();
      if (response.ok && data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        throw new Error(data.error || 'Không thể kết nối AI lúc này.');
      }
    } catch (err) {
      console.error('Lỗi khi gọi chatbot:', err);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: '❌ Không thể kết nối trợ lý AI. Vui lòng thử lại sau!'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToStore = (store) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`;
    window.open(url, '_blank');
  };

  // === Feedback logic ===
  const handleStarClick = (criterion, value) => {
    setRatings(prev => ({ ...prev, [criterion]: value }));
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    // Bắt buộc nhập tên
    if (!customerName.trim()) {
      setSubmitStatus('Vui lòng nhập tên của bạn.');
      return;
    }
    // Cho phép gửi nếu có ít nhất 1 sao HOẶC có bình luận
    const hasRating = Object.values(ratings).some(r => r > 0);
    if (!hasRating && !comment.trim()) {
      setSubmitStatus('Vui lòng đánh giá hoặc để lại bình luận.');
      return;
    }

    setSubmitStatus('Đang gửi...');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerName.trim(),
          quality: ratings.quality,
          smoothness: ratings.smoothness,
          photo: ratings.photo,
          service: ratings.service,
          comment: comment.trim() || null,
          id_admin: null
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus(`Cảm ơn ${customerName}! Đánh giá đã được gửi thành công!`);
        setTimeout(() => {
          setIsFeedbackOpen(false);
          setCustomerName('');
          setRatings({ quality: 0, smoothness: 0, photo: 0, service: 0 });
          setComment('');
          setSubmitStatus('');
        }, 2500);
      } else {
        throw new Error(data.message || 'Lỗi server');
      }
    } catch (err) {
      console.error('Lỗi gửi đánh giá:', err);
      setSubmitStatus('Gửi thất bại. Vui lòng thử lại!');
      setTimeout(() => setSubmitStatus(''), 3000);
    }
  };

  const renderStars = (criterion, rating) => {
    return Array.from({ length: 5 }, (_, i) => i + 1).map(star => (
      <span
        key={star}
        className={`star ${star <= rating ? 'filled' : ''}`}
        onClick={() => handleStarClick(criterion, star)}
      >
        ★
      </span>
    ));
  };

  return (
    <div className="download-container">
      <button 
        onClick={handleFinish}
        className="home-button"
        title="Về màn hình chính"
      >
        <FaHome size={24} />
      </button>
      <div className='countdown'>
      ⌛: {countdown}
      </div>
      {/* Nội dung chính (giống như trước, KHÔNG có feedback ở đây) */}
      <div className="content-wrapper">
        <section className="hero-section">
          <h1 className="title">💖 SweetLens Photo Booth 💖</h1>
          <p className="subtitle">
            Nơi lưu giữ những khoảnh khắc ngọt ngào — Chụp ảnh, in ảnh, thanh toán tự động chỉ trong vài giây!
          </p>
        </section>

        <section className="features-grid">
          <div className="feature-card"><div className="icon">📸</div><h3>Chụp ảnh tự động</h3><p>Máy chụp tự động sau 10s...</p></div>
          <div className="feature-card"><div className="icon">🖨️</div><h3>In ảnh siêu tốc</h3><p>Chất lượng cao, in trong 15s...</p></div>
          <div className="feature-card"><div className="icon">💳</div><h3>Thanh toán không chạm</h3><p>Hỗ trợ QR, voucher...</p></div>
        </section>

        <section className="stores-section">
          <h2 className="section-title">📍 Các chi nhánh SweetLens</h2>
          <div className="stores-grid">
            {stores.map((store, index) => (
              <div key={index} className="store-card">
                <h3 className="store-name">🎀 {store.name}</h3>
                <p className="store-address">{store.address}</p>
                <button className="navigate-btn" onClick={() => handleNavigateToStore(store)}>🗺️ Chỉ đường</button>
              </div>
            ))}
          </div>
        </section>

        <footer className="page-footer">
          <p>© 2025 SweetLens Photo Booth — Nơi lưu giữ những khoảnh khắc ngọt ngào nhất 💖</p>
          <p>Liên hệ: support@sweetlens.vn | Hotline: 1900 888 666</p>
        </footer>
      </div>

      {/* Floating Buttons */}
      <button
        className="floating-feedback-btn"
        onClick={() => setIsFeedbackOpen(true)}
        aria-label="Phản hồi trải nghiệm"
      >
        🎀
      </button>

      <button
        className="floating-chat-btn"
        onClick={() => setIsChatOpen(true)}
        aria-label="Hỗ trợ AI"
      >
        💬
      </button>

      {/* ✅ FEEDBACK MODAL (overlay) */}
      {isFeedbackOpen && (
        <div className="feedback-overlay" onClick={() => setIsFeedbackOpen(false)}>
          <div className="feedback-container" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-header">
              <h4>🎀 Phản hồi SweetLens</h4>
              <button className="feedback-close" onClick={() => setIsFeedbackOpen(false)}>×</button>
            </div>
            <div className="feedback-content">
              {/* Ô NHẬP TÊN */}
             {/* Ô NHẬP TÊN – ĐÃ ĐỒNG BỘ STYLE VỚI feedback-comment */}
              <div className="name-input-section">
                <label className="name-label">Họ & tên <span className="required">*</span></label>
                <input
                  type="text"
                  className="feedback-comment"  // Dùng chung class với textarea
                  placeholder="Nhập tên của bạn..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  maxLength="100"
                />
              </div>
              <div className="rating-criteria">
                {[
                  { key: 'quality', label: 'Chất lượng máy & thiết bị' },
                  { key: 'smoothness', label: 'Độ mượt mà khi sử dụng' },
                  { key: 'photo', label: 'Ảnh đẹp, sắc nét' },
                  { key: 'service', label: 'Dịch vụ & hỗ trợ' }
                ].map(({ key, label }) => (
                  <div key={key} className="criterion">
                    <div className="criterion-label">{label}</div>
                    <div className="stars">{renderStars(key, ratings[key])}</div>
                  </div>
                ))}
              </div>

              <textarea
                className="feedback-comment"
                placeholder="Chia sẻ thêm ý kiến... (tùy chọn)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows="3"
              />

              {submitStatus && (
                <p className={`feedback-status ${submitStatus.includes('✅') ? 'success' : submitStatus.includes('❌') ? 'error' : ''}`}>
                  {submitStatus}
                </p>
              )}

              <button
                className="feedback-submit-btn"
                onClick={handleSubmitFeedback}
                disabled={Object.values(ratings).every(r => r === 0) && !comment.trim()}
              >
                💌 Gửi phản hồi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot (giữ nguyên) */}
      {isChatOpen && (
        <div className="chat-overlay" onClick={() => setIsChatOpen(false)}>
          <div className="chat-container" onClick={(e) => e.stopPropagation()}>
            <div className="chat-header">
              <h4>🤖 Trợ lý SweetLens AI</h4>
              <button className="chat-close" onClick={() => setIsChatOpen(false)}>×</button>
            </div>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-welcome">Xin chào! Mình có thể giúp gì cho bạn? 😊</div>
              ) : (
                messages.map((msg, idx) => <div key={idx} className={`message ${msg.role}`}>{msg.content}</div>)
              )}
              {isLoading && <div className="message assistant"><span className="typing-indicator">Đang suy nghĩ...</span></div>}
            </div>
            <div className="chat-input-area">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Nhập câu hỏi..."
                disabled={isLoading}
                className="chat-input"
              />
              <button onClick={handleSendMessage} disabled={!inputMessage.trim() || isLoading} className="chat-send-btn">↵</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Download;