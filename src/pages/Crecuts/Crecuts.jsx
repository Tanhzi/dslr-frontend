// Crecuts.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query'; // 👈 Thêm dòng này
import Chatbot from '../../components/Chatbot';
import './crecuts.css';

function Crecuts() {
  const navigate = useNavigate();

  //Lấy thông tin từ auth
  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };

  const [auth, setAuth] = useState(getAuth());
  const { id_admin: idAdmin,id_topic: idTopic } = auth;
  

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedCut, setSelectedCut] = useState(null);
  const [selectedPrice, setSelectedPrice] = useState(null);

  // Dữ liệu cuts cố định
  const smallCuts = [
    { label: '3 Cuts', value: '3', img: '3cuts.png' },
    { label: '4 Cuts', value: '41', img: '4cutsn.png' },
  ];
  const largeCuts = [
    { label: '4 Cuts', value: '42', img: '4cutst.png' },
    { label: '6 Cuts', value: '6', img: '6cuts.png' },
  ];

  // 🔥 1) Fetch background với useQuery
  const { data: backgroundData } = useQuery({
    queryKey: ['background', idAdmin, idTopic],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_BASE_URL}/background?id_admin=${idAdmin}&id_topic=${idTopic}`)
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        }),
    enabled: !!idAdmin && !!idTopic,
    staleTime: 5 * 60 * 1000, // 5 phút cache
  });

  // 🔥 2) Fetch prices với useQuery
  const { data: pricesData, isLoading: pricesLoading } = useQuery({
    queryKey: ['prices', idAdmin],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_BASE_URL}/prices?id_admin=${idAdmin}`)
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        }),
    enabled: !!idAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // State cho giá đã format
  const [smallPrices, setSmallPrices] = useState([]);
  const [largePrices, setLargePrices] = useState([]);

// 🔥 Xử lý background khi có dữ liệu
useEffect(() => {
  if (backgroundData?.status === 'success' && backgroundData.background) {
    const fullBackgroundUrl = backgroundData.background.startsWith('http')
      ? backgroundData.background
      : `${import.meta.env.VITE_API_BASE_URL}/${backgroundData.background}`;

    // ✅ Lưu background vào localStorage
    localStorage.removeItem('backgroundImage');
    localStorage.setItem('backgroundImage', fullBackgroundUrl);

    if (backgroundData.applyBackground) {
      document.body.style.backgroundImage = `url(${fullBackgroundUrl})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = 'none';
      // Xóa background trong localStorage nếu không áp dụng
      localStorage.removeItem('backgroundImage');
    }
  } else {
    // Nếu không có background hợp lệ, xóa khỏi localStorage
    localStorage.removeItem('backgroundImage');
    document.body.style.backgroundImage = 'none';
  }

  // Cleanup khi component unmount
  return () => {
    document.body.style.backgroundImage = 'none';
  };
}, [backgroundData]);

  // Xử lý prices khi có dữ liệu
  useEffect(() => {
    if (pricesData?.status === 'success') {
      const { size1, size2 } = pricesData.data;

      const formatPrices = (arr) =>
        arr?.reduce((acc, curr, idx) => {
          if (idx % 2 === 0) {
            const value = curr;
            const raw = arr[idx + 1];
            acc.push({
              label: value,
              value,
              price: `${Number(raw).toLocaleString('vi-VN')} VNĐ`,
            });
          }
          return acc;
        }, []) || [];

      setSmallPrices(formatPrices(size1));
      setLargePrices(formatPrices(size2));
    }
  }, [pricesData]);

  // Handlers (giữ nguyên)
  const handleSmallCutClick = (cut) => {
    setSelectedSize('small');
    setSelectedCut(cut);
    setSelectedPrice(null);
  };

  const handleLargeCutClick = (cut) => {
    setSelectedSize('large');
    setSelectedCut(cut);
    setSelectedPrice(null);
  };

  const handlePriceClick = (price) => {
    if (
      (selectedSize === 'small' && smallPrices.includes(price)) ||
      (selectedSize === 'large' && largePrices.includes(price))
    ) {
      setSelectedPrice(price);
    }
  };

  const handleContinue = () => {
    if (selectedCut && selectedPrice) {
      const rawSize = ['3', '41'].includes(selectedCut.value)
        ? selectedPrice.value / 2
        : selectedPrice.value;
      const finalSize = String(rawSize);

      navigate('/Discount', {
        state: {
          cut: selectedCut.value,
          size: finalSize,
          price: selectedPrice.price,
        },
      });
    }
  };

  const isDisabled = !selectedCut || !selectedPrice;

  // (Tùy chọn) Hiển thị loading khi đang fetch prices
  if (pricesLoading && !pricesData) {
    return <div className="cre-container">Đang tải giá...</div>;
  }

  return (
    <div className="cre-container">
      <h2 className="text-center mb-4 touch-to-crecuts pt-4 fs-3">
        VUI LÒNG CHỌN LOẠI VÀ SỐ LƯỢNG ẢNH
      </h2>

      {/* Khổ nhỏ */}
      <div className="mb-5 d-flex justify-content-center">
        <div className="d-flex align-items-center mx-5">
          <h4 className="mau_text">Khổ nhỏ 1+1</h4>
        </div>
        <div className="row justify-content-center mt-3 mx-3">
          {smallCuts.map((item) => (
            <div className="col-auto" key={item.value}>
              <div
                className={`cut-card ${
                  selectedCut?.value === item.value && selectedSize === 'small'
                    ? 'cut-card-active'
                    : ''
                }`}
                onClick={() => handleSmallCutClick(item)}
              >
                <img src={item.img} alt={item.label} className="cut-image" />
                <div className="cut-label">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="row justify-content-center mt-3">
          {smallPrices.map((item) => (
            <div className="col-auto" key={item.value}>
              <div
                className={`price-card ${
                  selectedPrice?.value === item.value && selectedSize === 'small'
                    ? 'price-card-active'
                    : ''
                }`}
                onClick={() => handlePriceClick(item)}
              >
                <div className="price-number">{item.label}</div>
                <div className="price-text">{item.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Khổ lớn */}
      <div className="mb-3 d-flex justify-content-center">
        <div className="d-flex align-items-center mx-5">
          <h4 className="mau_text">Khổ lớn 1+1</h4>
        </div>
        <div className="row justify-content-center mt-3 mx-3">
          {largeCuts.map((item) => (
            <div className="col-auto" key={item.value}>
              <div
                className={`cut-card ${
                  selectedCut?.value === item.value && selectedSize === 'large'
                    ? 'cut-card-active'
                    : ''
                }`}
                onClick={() => handleLargeCutClick(item)}
              >
                <img src={item.img} alt={item.label} className="cut-image" />
                <div className="cut-label">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="row justify-content-center mt-3">
          {largePrices.map((item) => (
            <div className="col-auto" key={item.value}>
              <div
                className={`price-card ${
                  selectedPrice?.value === item.value && selectedSize === 'large'
                    ? 'price-card-active'
                    : ''
                }`}
                onClick={() => handlePriceClick(item)}
              >
                <div className="price-number">{item.label}</div>
                <div className="price-text">{item.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="navigation-buttons">
        <button className="box1 mb-3" onClick={() => navigate(-1)}>
          QUAY LẠI
        </button>
        <button className="box2 mb-3" onClick={handleContinue} disabled={isDisabled}>
          TIẾP TỤC
        </button>
      </div>
      <Chatbot />
    </div>
  );
}

export default Crecuts;