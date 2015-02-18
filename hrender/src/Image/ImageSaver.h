#ifndef _IMAGESAVER_H_
#define _IMAGESAVER_H_

#include "Ref.h"
#include <string>

class BufferImageData;

class ImageSaver : public RefCount
{
private:
    class Impl;
    Impl* m_imp;
    
public:
    enum Format {
        JPG = 1,
        TGA,
        HDR
    };
    
    ImageSaver();
    ~ImageSaver();
    bool Save(const char* filename, BufferImageData* data);
    std::string SaveMemory(unsigned int format, BufferImageData* data);
};

#endif //_IMAGESAVER_H_
