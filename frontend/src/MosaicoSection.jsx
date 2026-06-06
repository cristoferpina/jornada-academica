import React from 'react';
import conferencista1Img from '../assets/images/conferencistas/1.png';
import conferencista2Img from '../assets/images/conferencistas/2.jpg';
import conferencista3Img from '../assets/images/conferencistas/3.jpg';
import conferencista4Img from '../assets/images/conferencistas/4.png';

export default function MosaicoSection() {
  const tiles = [
    {
      id: 0,
      title: "Conferencistas",
      mobileImg: conferencista1Img,
      desktopImg: conferencista1Img,
      alt: "Conferencistas",
      overlayColor: "bg-green-700/60",
      hoverColor: "group-hover:bg-[#73243c]/70",
      href: "#"
    },
    {
      id: 1,
      title: "Escenarios",
      mobileImg: conferencista2Img,
      desktopImg: conferencista2Img,
      alt: "Escenarios",
      overlayColor: "bg-green-700/60",
      hoverColor: "group-hover:bg-[#73243c]/70",
      href: "#evento"
    },
    {
      id: 2,
      title: "Conferencias",
      mobileImg: conferencista3Img,
      desktopImg: conferencista3Img,
      alt: "Conferencias",
      overlayColor: "bg-green-700/60",
      hoverColor: "group-hover:bg-[#73243c]/70",
      href: "#evento"
    },
    {
      id: 3,
      title: "Instituciones Invitadas",
      mobileImg: conferencista4Img,
      desktopImg: conferencista4Img,
      alt: "Instituciones Invitadas",
      overlayColor: "bg-green-700/60",
      hoverColor: "group-hover:bg-[#73243c]/70",
      href: "#instituciones"
    }
  ];

  return (
    <section className="py-8 bg-white relative z-20 -mt-4 shadow-xl rounded-t-3xl scroll-mt-20" id="mosaico">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mosaico grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" formato="grid" escala="chica" coloractivo="blue" colorinactivo="blue" controlesocultos="0" anchosfijos="0" role="rowgroup">
          {tiles.map((tile) => (
            <div 
              key={tile.id}
              className="azulejo relative overflow-hidden rounded-xl aspect-[4/3] group" 
              tipo-de-fondo="imagen" 
              estado="inactivo" 
              funcionalidad="enlace" 
              etiqueta="texto-centrado" 
              role="row" 
              orden_lg="0" 
              orden_md="0" 
              orden_sm={tile.id < 2 ? "0" : "2"} 
              azulejo-id={tile.id} 
              style={{ order: 0 }}
            >
              <div className="azulejo__contenedor azulejo__contenedor-- w-full h-full">
                <a href={tile.href || "#"} className="w-full h-full block">
                  <div className="azulejo__imagen_de_fondo azulejo__imagen_de_fondo-- w-full h-full">
                    <img 
                      className="azulejo__imagen_de_fondo__img azulejo__imagen_de_fondo__img--chica w-full h-full object-cover md:hidden" 
                      src={tile.mobileImg} 
                      alt={tile.alt} 
                    />
                    <img 
                      className="azulejo__imagen_de_fondo__img azulejo__imagen_de_fondo__img--grande w-full h-full object-cover hidden md:block group-hover:scale-105 transition-transform duration-500" 
                      src={tile.desktopImg} 
                      alt={tile.alt} 
                    />
                  </div>
                  <span className={`azulejo__contenido azulejo__contenido-- absolute inset-0 flex items-center justify-center text-white font-bold text-xl transition-colors ${tile.overlayColor} ${tile.hoverColor}`}>
                    {tile.title}
                  </span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
