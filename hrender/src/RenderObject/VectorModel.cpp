#include <string>
#include "VectorModel.h"
#include "BufferLineData.h"
#include "BufferTetraData.h"

class VectorModel::Impl
{
public:
    Impl()
    {
        m_line = 0;
    }
    
    ~Impl()
    {
    }
    
    bool SetShader(const std::string& shaderfile)
    {
        m_shaderfile = shaderfile;
        return true;
    }
    
    bool Create(BufferLineData* linedata, BufferTetraData* tetradata)
    {
        if (!linedata) {
            return false;
        }
        m_line = linedata;
        
        
        /* //TEST
        if (!tetradata) {
            return false;
        }
        m_tetra = tetradata;
        */
        
        return true;
    }
    
    BufferLineData* GetLine() const {
        return m_line;
    }

    BufferTetraData* GetTetra() const {
        return m_tetra;
    }
        
    const std::string& GetShader() const {
        return m_shaderfile;
    }
    
private:
    RefPtr<BufferLineData>  m_line;
    RefPtr<BufferTetraData> m_tetra;
    std::string m_shaderfile;
};

VectorModel::VectorModel() : RenderObject(TYPE_VECTOR) 
{
    m_imp = new Impl();
}

VectorModel::~VectorModel()
{
    delete m_imp;
}

bool VectorModel::SetShader(const std::string& shaderfile)
{
    return m_imp->SetShader(shaderfile);
}

bool VectorModel::Create(BufferLineData* linedata, BufferTetraData* tetradata)
{
    return m_imp->Create(linedata, tetradata);
}

BufferLineData* VectorModel::GetLine() const
{
    return m_imp->GetLine();
}

BufferTetraData* VectorModel::GetTetra() const
{
    return m_imp->GetTetra();
}

const std::string& VectorModel::GetShader() const
{
    return m_imp->GetShader();
}
