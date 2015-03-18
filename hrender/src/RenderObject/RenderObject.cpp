/**
 * @file RenderObject.cpp
 * レンダーオブジェクト
 */
#include "RenderObject.h"
#include "../Buffer/BufferImageData.h"

/**
 * レンダーオブジェクト
 */
class RenderObject::Impl
{
public:
    /// モードタイプを返す.
    RenderObject::MODE_TYPE GetType() const {
        return m_type;
    }

    /// タイプ文字列を返す.
    std::string GetTypeString() const {
        static const char* modeString[] = {
            "NONE",
            "SETTING",
            "CAMERA",
            "VOLUME",
            "POLYGON",
            "LINE",
            "POINT",
            "TETRA",
            "VECTOR"
        };
        return std::string(modeString[m_type]);
    }

    //--------------------------------------------------
    //Get
    //--------------------------------------------------
    /// 移動量を返す
    const VX::Math::vec3&  GetTranslate() const { return m_trans; }
    /// 回転量を返す
    const VX::Math::vec3&  GetRotate()    const { return m_rotat; }
    /// スケールを返す
    const VX::Math::vec3&  GetScale()     const { return m_scale; }
    /// 変換行列を返す
    const VX::Math::matrix GetTransformMatrix() const
    {
        return VX::Math::Translation(m_trans[0], m_trans[1], m_trans[2])
             * VX::Math::RotationYawPitchRoll(m_rotat[1], m_rotat[0], m_rotat[2])
             * VX::Math::Scaling(m_scale[0], m_scale[1], m_scale[2]); // Y,X,Z
    }
    
    typedef std::map<std::string, VX::Math::vec4> Vec4Map;
    typedef std::map<std::string, VX::Math::vec3> Vec3Map;
    typedef std::map<std::string, VX::Math::vec2> Vec2Map;
    typedef std::map<std::string, float>         FloatMap;
    typedef std::map<std::string, RefPtr<const BufferImageData> > TextureMap;
    /// Uniformマップを返す
    const Vec4Map&    GetUniformVec4 ()   const { return m_vec4s;  }
    /// Uniformマップを返す
    const Vec3Map&    GetUniformVec3 ()   const { return m_vec3s;  }
    /// Uniformマップを返す
    const Vec2Map&    GetUniformVec2 ()   const { return m_vec2s;  }
    /// Uniformマップを返す
    const FloatMap&   GetUniformFloat()   const { return m_floats; }
    /// Uniformテクスチャマップを返す
    const TextureMap& GetUniformTexture() const { return m_imgs;   }

    //--------------------------------------------------
    //Set
    //--------------------------------------------------
    /**
     * 移動量の設定
     * @param x x
     * @param y y
     * @param z z
     */
    bool SetTranslate(float x, float y, float z) {
        m_trans[0] = x;
        m_trans[1] = y;
        m_trans[2] = z;
        return true;
    }
    
    /**
     * 回転量の設定
     * @param x x(radian)
     * @param y y(radian)
     * @param z z(radian)
     */
    bool SetRotate(float x, float y, float z) {
        m_rotat[0] = x;
        m_rotat[1] = y;
        m_rotat[2] = z;
        return true;
    }
    
    /**
     * スケールの設定
     * @param x x
     * @param y y
     * @param z z
     */
    bool SetScale(float x, float y, float z) {
        m_scale[0] = x;
        m_scale[1] = y;
        m_scale[2] = z;
        return true;
    }
    
    /**
     * Unifrom値の設定
     * @param name Uniform名
     * @param x x
     * @param y y
     * @param z z
     * @param w w
     */
    bool SetVec4(const std::string& name, float x, float y, float z, float w) {
        m_vec4s[name] = VX::Math::vec4(x,y,z,w);
        return true;
    }
    
    /**
     * Unifrom値の設定
     * @param name Uniform名
     * @param x x
     * @param y y
     * @param z z
     */
    bool SetVec3(const std::string& name, float x, float y, float z) {
        m_vec3s[name] = VX::Math::vec3(x,y,z);
        return true;
    }
    
    /**
     * Unifrom値の設定
     * @param name Uniform名
     * @param x x
     * @param y y
     */
    bool SetVec2(const std::string& name, float x, float y) {
        m_vec2s[name] = VX::Math::vec2(x,y);
        return true;
    }
    
    /**
     * Unifrom値の設定
     * @param name Uniform名
     * @param x x
     */
    bool SetFloat(const std::string& name, float x) {
        m_floats[name] = x;
        return true;
    }
    
    /**
     * テクスチャの設定
     * @param name Uniform名
     * @param img イメージデータ
     */
    bool SetTexture(const std::string& name, const BufferImageData* img) {
        m_imgs[name] = img;
        return true;
    }

    /// コンストラクタ
    Impl(MODE_TYPE t) : m_type(t)
    {
        m_trans =  VX::Math::vec3(0, 0, 0);
        m_rotat =  VX::Math::vec3(0, 0, 0);
        m_scale =  VX::Math::vec3(1, 1, 1);
    };
    
    /// デストラクタ
    ~Impl() {};
    
private:
    // Transform↲
    VX::Math::vec3 m_trans;
    VX::Math::vec3 m_rotat;
    VX::Math::vec3 m_scale;

    //mapped data
    std::map<std::string, VX::Math::vec4> m_vec4s;
    std::map<std::string, VX::Math::vec3> m_vec3s;
    std::map<std::string, VX::Math::vec2> m_vec2s;
    std::map<std::string, float>          m_floats;
    std::map<std::string, int>            m_ints;
    std::map<std::string, RefPtr<const BufferImageData> > m_imgs;

    //mode type
    RenderObject::MODE_TYPE m_type;
};

/// コンストラクタ
RenderObject::RenderObject(MODE_TYPE t) : m_imp(new Impl(t)) {}
/// デストラクタ
RenderObject::~RenderObject() { delete m_imp; }

/// モードタイプを返す.
RenderObject::MODE_TYPE RenderObject::GetType() const { return m_imp->GetType();       }
/// タイプ文字列を返す.
std::string RenderObject::GetTypeString()       const { return m_imp->GetTypeString(); }

//--------------------------------------------------
//Get
//--------------------------------------------------
/// 移動量を返す
const VX::Math::vec3&  RenderObject::GetTranslate()               const { return m_imp->GetTranslate();       }
/// 回転量を返す
const VX::Math::vec3&  RenderObject::GetRotate()                  const { return m_imp->GetRotate();          }
/// スケールを返す
const VX::Math::vec3&  RenderObject::GetScale()                   const { return m_imp->GetScale();           }
/// 変換行列を返す
const VX::Math::matrix RenderObject::GetTransformMatrix()         const { return m_imp->GetTransformMatrix(); }
/// Uniformマップを返す
const RenderObject::Vec4Map&  RenderObject::GetUniformVec4 ()     const { return m_imp->GetUniformVec4();     }
/// Uniformマップを返す
const RenderObject::Vec3Map&  RenderObject::GetUniformVec3 ()     const { return m_imp->GetUniformVec3();     }
/// Uniformマップを返す
const RenderObject::Vec2Map&  RenderObject::GetUniformVec2 ()     const { return m_imp->GetUniformVec2();     }
/// Uniformマップを返す
const RenderObject::FloatMap& RenderObject::GetUniformFloat()     const { return m_imp->GetUniformFloat();    }
/// Uniformテクスチャマップを返す
const RenderObject::TextureMap& RenderObject::GetUniformTexture() const { return m_imp->GetUniformTexture();  }

//--------------------------------------------------
//Set
//--------------------------------------------------
/**
 * 移動量の設定
 * @param x x
 * @param y y
 * @param z z
 */
bool RenderObject::SetTranslate(float x, float y, float z)                              { return m_imp->SetTranslate(x, y, z);     }
/**
 * 回転量の設定
 * @param x x(radian)
 * @param y y(radian)
 * @param z z(radian)
 */
bool RenderObject::SetRotate(float x, float y, float z)                                 { return m_imp->SetRotate(x, y, z);        }
/**
 * スケールの設定
 * @param x x
 * @param y y
 * @param z z
 */
bool RenderObject::SetScale(float x, float y, float z)                                  { return m_imp->SetScale(x, y, z);         }
/**
 * Unifrom値の設定
 * @param name Uniform名
 * @param x x
 * @param y y
 * @param z z
 * @param w w
 */
bool RenderObject::SetVec4(const std::string& name, float x, float y, float z, float w) { return m_imp->SetVec4(name, x, y, z, w); }
/**
 * Unifrom値の設定
 * @param name Uniform名
 * @param x x
 * @param y y
 * @param z z
 */
bool RenderObject::SetVec3(const std::string& name, float x, float y, float z)          { return m_imp->SetVec3(name, x, y, z);    }
/**
 * Unifrom値の設定
 * @param name Uniform名
 * @param x x
 * @param y y
 */
bool RenderObject::SetVec2(const std::string& name, float x, float y)                   { return m_imp->SetVec2(name, x, y);       }
/**
 * Unifrom値の設定
 * @param name Uniform名
 * @param x x
 */
bool RenderObject::SetFloat(const std::string& name, float x)                           { return m_imp->SetFloat(name, x);         }
/**
 * テクスチャの設定
 * @param name Uniform名
 * @param img イメージデータ
 */
bool RenderObject::SetTexture(const std::string& name, const BufferImageData* img)      { return m_imp->SetTexture(name, img);     }


