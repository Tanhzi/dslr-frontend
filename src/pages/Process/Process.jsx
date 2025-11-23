import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Chatbot from '../../components/Chatbot';
import './Process.css';
import { useCountdown } from "../../contexts/CountdownContext";

function Process() {
  const navigate = useNavigate();
  const location = useLocation();
  const { size, cut, frameType, selectedFrame, selectedFrameId } = location.state || {}; // ← ĐÃ THÊM selectedFrame, selectedFrameId

  //Lấy thông tin từ auth
  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth, setAuth] = useState(getAuth());
  const { id_admin: idAdmin,id_topic: idTopic } = auth;

  const [backgroundImage, setBackgroundImage] = useState(null);
  const [logoImage, setLogoImage] = useState('logo.jpg');
  const [isGlobalBackground, setIsGlobalBackground] = useState(false);
  const [notes] = useState([
    'Máy sẽ chụp tự động sau mỗi 10s',
    'Nếu là lần đầu đến với Memory booth\nHãy liên hệ nhân viên để được hỗ trợ',
    'Máy sẽ không trả lại tiền thừa, hãy liên hệ chúng mình để đổi tiền nhé!'
  ]);

  const { formattedCountdown, countdown } = useCountdown();
  
  useEffect(() => {
    if (countdown === 0) {
      navigate('/Appclien');
    }
  }, [countdown, navigate]);

  // Sử dụng React Query để fetch dữ liệu
  const { data: eventData, isLoading, error } = useQuery({
    queryKey: ['event', idAdmin, idTopic],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/background?id_admin=${idAdmin}&id_topic=${idTopic}`
      );
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    },
    enabled: !!idAdmin && !!idTopic,
    staleTime: 5 * 60 * 1000, // Cache 5 phút
  });

  // Xử lý dữ liệu khi có
  useEffect(() => {
    if (eventData && !eventData.status) {
      // Background
      if (eventData.background) {
        const bgUrl = `data:image/jpeg;base64,${eventData.background}`;
        if (eventData.ev_back === 1 || eventData.ev_back === 2) {
          setBackgroundImage(bgUrl);
        }
      }

      // Logo
      if (eventData.logo && eventData.ev_logo === 1) {
        setLogoImage(`data:image/jpeg;base64,${eventData.logo}`);
      }
    }
  }, [eventData]);

  if (isLoading) {
    return <div className="app-container">Đang tải...</div>;
  }

  if (error) {
    console.error('Lỗi khi tải dữ liệu event:', error);
    // Có thể hiển thị thông báo lỗi ở đây
  }

  // Handler click thủ công - ĐÃ SỬA: TRUYỀN selectedFrame và selectedFrameId
  const handleClick = () => {
      navigate('/Photo', { 
        state: { 
          size, 
          cut, 
          frameType, 
          id_admin: idAdmin, 
          id_topic: idTopic,
          selectedFrameId: selectedFrameId,    // ← ĐÃ THÊM
          selectedFrame: selectedFrame         // ← ĐÃ THÊM
        } 
      });
    };

  return (
    <div 
      className="app-container" 
      style={backgroundImage ? { 
        background: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: isGlobalBackground ? 'fixed' : 'scroll'
      } : {}}
    >
      <div className="countdown">
        ⌛: {formattedCountdown}
      </div>
      
      {/* Logo ở góc trên bên trái */}
      <div className="logo-container">
        <img src={logoImage} alt="Memory Booth Logo" className="logo-custom" />
      </div>

      {/* Phần trên - có thể click để điều hướng */}
      <div className="clickable-section" onClick={handleClick}>
        <div className="title-container">
          <h4 className="touch-to">HƯỚNG DẪN CHỤP</h4>
        </div>
        {/* Thông tin chính */}
        <div className="info-box-custom">
            <p>Nhấn vào màn hình tiếp tục.<br />
            Bạn được chụp các ảnh liên tiếp.<br />
            Hãy chuẩn bị phụ kiện bạn nhé!</p>
        </div>
      </div>

      {/* Instructions - ở dưới cùng màn hình */}
      <div className="instruction-container">
        <div className="instruction-row">
          <div className="instruction-box">
            <div className="icon-heart">
              <i className="fas fa-heart"></i>
              <span className="heart-number">1</span>
            </div>
            <p>KHÔNG VỨT PHỤ KIỆN XUỐNG ĐẤT KHI CHỤP</p>
          </div>
          <div className="instruction-box">
            <div className="icon-heart">
              <i className="fas fa-heart"></i>
              <span className="heart-number">2</span>
            </div>
            <p>VUI LÒNG BỒI THƯỜNG KHI LÀM HỎNG</p>
          </div>
          <div className="instruction-box">
            <div className="icon-heart">
              <i className="fas fa-heart"></i>
              <span className="heart-number">3</span>
            </div>
            <p>GIÚP CHÚNG MÌNH ĐẶT LẠI PHỤ KIỆN LÊN KỆ NHÉ</p>
          </div>
        </div>
        <h5 className="btn-thank-you">CHÚNG MÌNH XIN CẢM ƠN</h5>
      </div>
      <Chatbot />
    </div>
  );
}

export default Process;